const MEASUREMENT_PERIOD = 30;
const FORECAST_PERIOD = 6;

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
    ]).then(values => {
      const data = values[0].data.map(d => ({ timeChunkIso: timeChunkToIso(d.time_chunk), max: d.max }));
      const forecast = values[1].data.map(f => ({ timeChunkIso: timeChunkToIso(f.time_chunk), forecast: f.max }));
      const combined = combineDataAndForecast(data, forecast);

      return { ...gym, data: combined };
    });
  });

  return Promise.all(promises);
}

function createChart(gym, max) {
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

document.addEventListener('DOMContentLoaded', () => {
  const gyms = [
    { id: 1, name: 'Nekala' },
    { id: 2, name: 'Lielahti' },
  ];

  fetchData(gyms).then(gymData => {
    const max = d3.max(gymData.map(gym => d3.max(gym.data, timeChunk => timeChunk.max)));
    gymData.forEach(gym => createChart(gym, max));
  })
});
