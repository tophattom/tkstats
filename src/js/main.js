function prettyTime(timeChunk) {
  return new Date(`${timeChunk}+00:00`).toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit' })
}

function prettyDateTime(timeChunk) {
  return new Date(`${timeChunk}+00:00`).toLocaleString('fi', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function fetchData(gyms) {
  const promises = gyms.map(gym => d3.json(`https://tkstats.r-f.fi/api.php?gym_id=${gym.id}`));
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

  const bars = chartContent.selectAll('div.bar')
    .data(gym)
    .join('div')
      .classed('bar', true)
      .classed('warning', d => d.max >= 25)
      .attr('data-value', d => d.max)
      .style('height', d => `${Math.max(2, yAxis(d.max))}%`);

  const xTicks = bars.append('span')
      .classed('tick', true)
      .classed('tick-x', true)
      .text(d => prettyTime(d.time_chunk));

  const tooltips = bars.append('div').classed('tooltip', true);
  tooltips.append('span')
    .classed('timestamp', true)
    .text(d => prettyDateTime(d.time_chunk));

  tooltips.append('span')
    .text(d => d.max);
}

document.addEventListener('DOMContentLoaded', () => {
  const gyms = [
    { id: 1, name: 'Nekala' },
    { id: 2, name: 'Lielahti' },
  ];

  fetchData(gyms).then(data => {
    const max = d3.max(data.map(gym => d3.max(gym, timeChunk => timeChunk.max)));
    data.forEach(gym => createChart(gym, max));
  })
});
