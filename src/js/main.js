function createChart(gym) {
  const chart = d3.select('#charts')
    .append('div')
      .classed('chart', true);

  d3.json(`https://tkstats.r-f.fi/api.php?gym_id=${gym.id}`)
    .then(data => {
      const yAxis = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.max)])
        .range([0, 100]);

      chart.append('div')
        .classed('axis', true);

      chart.selectAll('div.bar')
        .data(data)
        .enter()
        .append('div')
          .classed('bar', true)
          .classed('warning', d => d.max >= 20)
          .style('height', d => `${Math.max(2, yAxis(d.max))}%`);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const gyms = [
    { id: 1, name: 'Nekala' },
  ];

  gyms.forEach(createChart);
});
