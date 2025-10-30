d3.csv("socialMedia.csv").then(function(data) {
  // Convert Likes to numeric
  data.forEach(d => d.Likes = +d.Likes);

  // =============================
  // PART 1: BOX PLOT
  // =============================
  const margin = {top:40,right:40,bottom:60,left:60},
        width = 600 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom;

  const svgBox = d3.select("#boxplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScaleBox = d3.scaleBand()
    .domain([...new Set(data.map(d => d.AgeGroup))])
    .range([0, width])
    .padding(0.3);

  const yScaleBox = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Likes)])
    .range([height, 0]);

  svgBox.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScaleBox));

  svgBox.append("g").call(d3.axisLeft(yScaleBox));

  svgBox.append("text")
    .attr("x", width/2).attr("y", height+45)
    .attr("text-anchor","middle")
    .text("Age Group");

  svgBox.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-height/2).attr("y",-45)
    .attr("text-anchor","middle")
    .text("Number of Likes");

  // Compute quantiles by AgeGroup
  const rollupFunction = g => {
    const v = g.map(d=>d.Likes).sort(d3.ascending);
    return {
      min:d3.min(v),
      q1:d3.quantile(v,0.25),
      median:d3.quantile(v,0.5),
      q3:d3.quantile(v,0.75),
      max:d3.max(v)
    };
  };

  const groupedBox = d3.rollup(data, rollupFunction, d=>d.AgeGroup);

  groupedBox.forEach((q,grp)=>{
    const x = xScaleBox(grp);
    const bw = xScaleBox.bandwidth();

    svgBox.append("line")
      .attr("x1",x+bw/2).attr("x2",x+bw/2)
      .attr("y1",yScaleBox(q.min)).attr("y2",yScaleBox(q.max))
      .attr("stroke","black");

    svgBox.append("rect")
      .attr("x",x).attr("width",bw)
      .attr("y",yScaleBox(q.q3))
      .attr("height",yScaleBox(q.q1)-yScaleBox(q.q3))
      .attr("fill","#dce8f2").attr("stroke","black");

    svgBox.append("line")
      .attr("x1",x).attr("x2",x+bw)
      .attr("y1",yScaleBox(q.median)).attr("y2",yScaleBox(q.median))
      .attr("stroke","black").attr("stroke-width",2);
  });


  // =============================
  // PART 2: SIDE-BY-SIDE BAR PLOT
  // =============================

  // Compute average Likes by Platform & PostType
  const avgData = Array.from(
    d3.rollup(
      data,
      v => d3.mean(v, d => d.Likes),
      d => d.Platform,
      d => d.PostType
    ),
    ([Platform, posts]) => {
      return Array.from(posts, ([PostType, AvgLikes]) => ({
        Platform, PostType, AvgLikes
      }));
    }
  ).flat();

  const svgBar = d3.select("#barplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const platforms = [...new Set(avgData.map(d=>d.Platform))];
  const postTypes = [...new Set(avgData.map(d=>d.PostType))];

  const x0 = d3.scaleBand().domain(platforms).range([0,width]).paddingInner(0.2);
  const x1 = d3.scaleBand().domain(postTypes).range([0,x0.bandwidth()]).padding(0.05);
  const yBar = d3.scaleLinear()
    .domain([0,d3.max(avgData,d=>d.AvgLikes)]).nice()
    .range([height,0]);
  const color = d3.scaleOrdinal()
    .domain(postTypes)
    .range(["#1f77b4","#ff7f0e","#2ca02c"]);

  svgBar.append("g").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x0));
  svgBar.append("g").call(d3.axisLeft(yBar));

  svgBar.append("text")
    .attr("x",width/2).attr("y",height+45).attr("text-anchor","middle")
    .text("Platform");
  svgBar.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-height/2).attr("y",-45)
    .attr("text-anchor","middle").text("Average Likes");

  const group = svgBar.selectAll(".platformGroup")
    .data(platforms)
    .enter().append("g")
    .attr("transform",d=>`translate(${x0(d)},0)`);

  group.selectAll("rect")
    .data(d=>avgData.filter(p=>p.Platform===d))
    .enter().append("rect")
    .attr("x",d=>x1(d.PostType))
    .attr("y",d=>yBar(d.AvgLikes))
    .attr("width",x1.bandwidth())
    .attr("height",d=>height - yBar(d.AvgLikes))
    .attr("fill",d=>color(d.PostType));

  // Legend
  const legend = svgBar.append("g").attr("transform",`translate(${width-100},0)`);
  postTypes.forEach((type,i)=>{
    legend.append("rect")
      .attr("x",0).attr("y",i*20)
      .attr("width",12).attr("height",12)
      .attr("fill",color(type));
    legend.append("text")
      .attr("x",18).attr("y",i*20+10)
      .text(type)
      .attr("alignment-baseline","middle");
  });


  // =============================
  // PART 3: LINE PLOT
  // =============================

  // Compute average Likes by Date
  const dateData = Array.from(
    d3.rollup(data, v => d3.mean(v, d => d.Likes), d => d.Date),
    ([Date, AvgLikes]) => ({ Date, AvgLikes })
  ).sort((a,b)=> new Date(a.Date) - new Date(b.Date));

  const svgLine = d3.select("#lineplot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xLine = d3.scalePoint()
    .domain(dateData.map(d=>d.Date))
    .range([0,width]);
  const yLine = d3.scaleLinear()
    .domain([0,d3.max(dateData,d=>d.AvgLikes)]).nice()
    .range([height,0]);

  svgLine.append("g")
    .attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(xLine))
    .selectAll("text")
    .style("text-anchor","end")
    .attr("transform","rotate(-25)");
  svgLine.append("g").call(d3.axisLeft(yLine));

  svgLine.append("text")
    .attr("x",width/2).attr("y",height+45)
    .attr("text-anchor","middle").text("Date");
  svgLine.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-height/2).attr("y",-45)
    .attr("text-anchor","middle").text("Average Likes");

  const line = d3.line()
    .x(d=>xLine(d.Date))
    .y(d=>yLine(d.AvgLikes))
    .curve(d3.curveNatural);

  svgLine.append("path")
    .datum(dateData)
    .attr("fill","none")
    .attr("stroke","#ff7f0e")
    .attr("stroke-width",2)
    .attr("d",line);
});


