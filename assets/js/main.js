/**
 * Created by Vlad Bezden on 8/3/2015.
 */

(function () {
    'use strict';

    var margin = 20,
        padding = 2,
        donutSize = 25,
        diameter = 650,
        root;

    // load json data
    d3.json('./assets/data/flare.json', function (error, json) {
        if (error) {
            console.error(error);
            return;
        }
        root = json;
        visualize();
    });

    var visualize = function () {
        var color = d3.scale.linear()
            .domain([0, depthCount(root)])
            .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
            .interpolate(d3.interpolateHcl);

        var pack = d3.layout.pack()
            .padding(padding)
            .size([diameter, diameter])
            .value(function (d) {
                return d.size;
            });

        var arc = d3.svg.arc()
            .innerRadius(function (d) {
                return d.r * d.k - donutSize;
                //return 0; // circle
            })
            .outerRadius(function (d) {
                return d.r * d.k;
            })
            .startAngle(0)
            .endAngle(function (d) {
                return d.value / 100 * 2 * Math.PI;
            });

        var arc2 = d3.svg.arc()
            .innerRadius(function (d) {
                return d.r * d.k - donutSize;
            })
            .outerRadius(function (d) {
                return d.r * d.k;
            })
            .startAngle(function (d) {
                return d.value / 100 * 2 * Math.PI;
                //return 2 * Math.PI;
            })
            .endAngle(function () {
                return 2 * Math.PI;
            });

        var svg = d3.select("body")
            .append("svg")
            .attr("width", diameter)
            .attr("height", diameter)
            .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

        var focus = root,
            nodes = pack.nodes(root),
            view;

        var bubble = svg.selectAll("g.bubble")
            .data(pack.nodes(root))
            .enter()
            .append("g")
            .attr("class", "bubble");

        var valuePath = bubble.append("path")
            .attr("class", function (d) {
                return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
            })
            .style("fill", function () {
                return "#00FF00";
            })
            .on("click", function (d) {
                if (focus !== d) {
                    zoom(d);
                    d3.event.stopPropagation();
                }
            });

        var remainingPath = bubble.append("path")
            .attr("class", function (d) {
                return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
            })
            .style("fill", function (d) {
                return color(d.depth);
            })
            .on("click", function (d) {
                if (focus !== d) {
                    zoom(d);
                    d3.event.stopPropagation();
                }
            });

        /* ------------------------------------------------------------- */

        var text = svg.selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("class", "label")
            .style("fill-opacity", function (d) {
                return d.parent === root ? 1 : 0;
            })
            .style("display", function (d) {
                return d.parent === root ? null : "none";
            })
            .text(function (d) {
                return d.name;
            });

        var node = svg.selectAll(".bubble,text");

        d3.select("body")
            .on("click", function () {
                zoom(root);
            });

        zoomTo([root.x, root.y, root.r * 2 + margin]);

        function zoom(d) {
            focus = d;

            var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", function () {
                    var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                    return function (t) {
                        zoomTo(i(t));
                    };
                });

            transition.selectAll("text")
                .filter(function (d) {
                    return d.parent === focus || this.style.display === "inline";
                })
                .style("fill-opacity", function (d) {
                    return d.parent === focus ? 1 : 0;
                })
                .each("start", function (d) {
                    if (d.parent === focus) this.style.display = "inline";
                })
                .each("end", function (d) {
                    if (d.parent !== focus) this.style.display = "none";
                });
        }

        function zoomTo(v) {
            var k = diameter / v[2];
            view = v;
            node.attr("transform", function (d) {
                return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
            });
            valuePath.attr("d", function (d) {
                d.k = k;
                return arc(d);
            });

            remainingPath.attr("d", function (d) {
                d.k = k;
                return arc2(d);
            });
        }

        /**
         * Counts JSON graph depth
         * @param {object} branch
         * @return {Number} object graph depth
         */
        function depthCount(branch) {
            if (!branch.children) {
                return 1;
            }
            return 1 + d3.max(branch.children.map(depthCount));
        }

        d3.select(self.frameElement).style("height", diameter + "px");
    };

}());
