const MEASUREMENT_PERIOD = 30;
const FORECAST_PERIOD = 6;

const WEEKDAYS = ['MA', 'TI', 'KE', 'TO', 'PE', 'LA', 'SU'];

function timeChunkToIso(timeChunk) {
  return (new Date(`${timeChunk.replace(' ', 'T')}+00:00`)).toISOString();
}

function prettyTime(time) {
  return time.toLocaleTimeString(
    'fi',
    { hour: '2-digit', minute: '2-digit' }
  );
}

function prettyDateTime(time) {
  return time.toLocaleString(
    'fi',
    {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  );
}

function rotateArray(arr, count) {
  var len = arr.length >>> 0,
      count = count >> 0;

  Array.prototype.unshift.apply(arr, Array.prototype.splice.call(arr, count % len, len));
  return arr;
}

function adjustFrequencyData(data) {
  // Extract the counts from the data and shift them by timezone offset
  // to convert from UTC to local timezone
  const freqCounts = data.map(d => d.avg_max);
  const tzOffset = (new Date()).getTimezoneOffset() / 60;
  rotateArray(freqCounts, tzOffset);

  // Replace original counts by the ones shifted by the tz offset
  const tzCorrectedData = data.map((d, i) => {
    d.avg_max = freqCounts[i];
    return d;
  });

  // Group by weekday
  const groupedData = {};
  tzCorrectedData.forEach(d => {
    if (!groupedData[d.weekday]) {
      groupedData[d.weekday] = [];
    }

    groupedData[d.weekday].push(d);
  });

  // Swap Sunday from first to last
  groupedData['7'] = groupedData['0'];
  delete groupedData['0'];

  return groupedData;
}

function combineDataAndForecast(data, forecast) {
  const dataByDate = new Map();
  data.forEach(d => dataByDate.set(d.timeChunkIso, { max: d.max }));
  forecast.forEach(d => dataByDate.set(d.timeChunkIso, { ...dataByDate.get(d.timeChunkIso), forecast: d.forecast }));

  const combined = []
  dataByDate.forEach((data, timeChunk) => {
    combined.push({ timeChunk: new Date(timeChunk), ...data });
  });

  return combined.sort((a, b) => a.timeChunk - b.timeChunk);
}

function fetchData(gyms) {
  const promises = gyms.map(gym => {
    return Promise.all([
      d3.json(`https://tkstats.r-f.fi/api/gym/${gym.id}?period=${MEASUREMENT_PERIOD}`),
      d3.json(`https://tkstats.r-f.fi/api/gym/${gym.id}/forecast?period=${FORECAST_PERIOD}`),
      d3.json(`https://tkstats.r-f.fi/api/gym/${gym.id}/frequency`),
    ]).then(values => {
      const data = values[0].data.map(d => ({ timeChunkIso: timeChunkToIso(d.time_chunk), max: d.max }));
      const forecast = values[1].data.map(f => ({ timeChunkIso: timeChunkToIso(f.time_chunk), forecast: f.max }));
      const combined = combineDataAndForecast(data, forecast);

      const freqData = adjustFrequencyData(values[2].data);

      return { ...gym, data: combined, freqData: freqData };
    });
  });

  return Promise.all(promises);
}

function createVisitorChart(gym, max) {
  const chart = d3.select('#charts')
    .append('div')
      .classed('chart', true);

  chart.append('h2').text(gym.name);

  const chartContent = chart.append('div').classed('chart-content', true);

  const yAxis = d3.scaleLinear()
    .domain([0, max])
    .range([0, 100]);

  const yAxisElem = chartContent.append('div')
    .classed('axis-y', true);

  yAxis.ticks(5).forEach(tick => {
    yAxisElem.append('div')
      .classed('tick', true)
      .classed('tick-y', true)
      .style('bottom', `${yAxis(tick)}%`)
      .text(tick);
  });

  const datapoints = chartContent.selectAll('div.bar')
    .data(gym.data)
    .join('div')
      .classed('datapoint', true);

  const barGroup = datapoints.append('div').classed('bar-group', true);
  const forecasts = barGroup.append('div')
    .classed('bar', true)
    .classed('forecast', true)
    .classed('warning', d => d.forecast >= 25)
    .attr('data-value', d => d.forecast)
    .style('height', d => `${Math.max(2, yAxis(d.forecast))}%`);

  const measurements = barGroup.append('div')
    .classed('bar', true)
    .classed('measurement', true)
    .classed('warning', d => d.max >= 25)
    .attr('data-value', d => d.max)
    .style('height', d => `${Math.max(2, yAxis(d.max))}%`);


  const xTicks = datapoints.append('span')
      .classed('tick', true)
      .classed('tick-x', true)
      .text(d => prettyTime(d.timeChunk));

  const measurementTooltip = measurements.append('div').classed('tooltip', true);
  measurementTooltip.append('span')
    .classed('timestamp', true)
    .text(d => prettyDateTime(d.timeChunk));

  measurementTooltip.append('span')
    .text(d => d.max);

  const forecastTooltip = forecasts.append('div').classed('tooltip', true);
  forecastTooltip.append('span')
    .classed('timestamp', true)
    .text(d => prettyDateTime(d.timeChunk));

  forecastTooltip.append('span')
    .text(d => `Ennuste: ${d.forecast}`);
}

function createFrequencyChart(gym) {
  const chart = d3.select('#charts')
    .append('div')
      .classed('chart', true)
      .classed('freq-chart', true);

  const maxValue = d3.max(Object.values(gym.freqData).flat(), d => d.avg_max);
  const colAxis = d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, 1]);

  const hourRow = chart.append('div')
    .classed('freq-chart-row', true)
    .selectAll('div.freq-chart-tick-block')
    .data([{}, ...gym.freqData['1']])
    .join('div')
      .classed('freq-chart-tick-block', true)
      .classed('freq-chart-block', true)
      .append('span')
        .classed('tick', true)
        .classed('freq-chart-tick', true)
        .classed('freq-chart-tick-hour', true)
        .text(d => d.hour ? d.hour.slice(0, 2) : '');

  const weekRows = chart.selectAll('div.weekday-row')
    .data(Object.values(gym.freqData))
    .join('div')
      .classed('freq-chart-row', true)
      .classed('weekday-row', true);

  weekRows.append('div')
    .classed('freq-chart-tick-block', true)
    .classed('freq-chart-block', true)
    .append('span')
      .classed('tick', true)
      .classed('freq-chart-tick', true)
      .text((d, i) => WEEKDAYS[i]);

  const hourBlocks = weekRows.selectAll('div.hour')
      .data(d => d)
      .join('div')
        .classed('freq-chart-block', true)
        .attr('data-value', d => d.avg_max)
        .style('background-color', d => d3.interpolateBlues(colAxis(d.avg_max)));

}

document.addEventListener('DOMContentLoaded', () => {
  const gyms = [
    { id: 1, name: 'Nekala' },
    { id: 2, name: 'Lielahti' },
  ];

  fetchData(gyms).then(gymData => {
    const max = d3.max(gymData.map(gym => d3.max(gym.data, timeChunk => timeChunk.max)));
    gymData.forEach(gym => {
      createVisitorChart(gym, max);
      createFrequencyChart(gym);
    });
  });
});
