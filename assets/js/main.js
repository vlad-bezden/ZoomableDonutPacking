/**
 * Created by Vlad Bezden on 8/3/2015.
 */

(function () {
    'use strict';

    var margin = 20,
        padding = 2,
        donutSize = 25,
        diameter = 800,
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
            .range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)'])
            .interpolate(d3.interpolateHcl);

        var pieColors = d3.scale.category20();

        var pack = d3.layout.pack()
            .padding(padding)
            .size([diameter, diameter])
            .value(function (d) {
                return d.size;
            });

        var pie = d3.layout.pie()
            .value(function (d) {
                return d;
            });

        var arc = d3.svg.arc()
            .innerRadius(function (d) {
                return d.r * d.k - donutSize;
            })
            .outerRadius(function (d) {
                return d.r * d.k;
            });

        var svg = d3.select('body')
            .append('svg')
            .attr('width', diameter)
            .attr('height', diameter)
            .append('g')
            .attr('transform', 'translate(' + diameter / 2 + ',' + diameter / 2 + ')');

        var nodes = pack.nodes(root),
            pieNodes = addPieData(nodes, pie),  // add pie information for each node
            focus = root,
            view;

        var bubble = svg.selectAll('g.bubble')
            .data(pieNodes)
            .enter()
            .append('g')
            .attr('class', 'bubble');

        var path = bubble.append('path')
            .attr('class', function (d) {
                return d.parent ? d.children ? 'node' : 'node node--leaf' : 'node node--root';
            })
            .style('fill', function (d) {
                return d.children ? color(d.depth) : pieColors(d.slice);
            })
            .on('click', function (d) {
                if (focus !== d) {
                    zoom(d);
                    d3.event.stopPropagation();
                }
            });

        /* ------------------------------------------------------------- */

        var text = svg.selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .attr('class', 'label')
            .style('fill-opacity', function (d) {
                return d.parent === root ? 1 : 0;
            })
            .style('display', function (d) {
                return d.parent === root ? null : 'none';
            })
            .text(function (d) {
                return d.name;
            });

        var node = svg.selectAll('.bubble,text');

        d3.select('body')
            .on('click', function () {
                zoom(root);
            });

        zoomTo([root.x, root.y, root.r * 2 + margin]);

        function zoom(d) {
            focus = d;

            var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween('zoom', function () {
                    var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
                    return function (t) {
                        zoomTo(i(t));
                    };
                });

            transition.selectAll('text')
                .filter(function (d) {
                    // returning false will keep label on and true will filter it out
                    return d.parent === focus
                        || d.parent === focus.__proto__
                        || this.style.display === 'inline';
                })
                .style('fill-opacity', function (d) {
                    return d.parent === focus || d.parent === Object.getPrototypeOf(focus) ? 1 : 0;
                })
                .each('start', function (d) {
                    if (d.parent === focus || d.parent === Object.getPrototypeOf(focus)) {
                        this.style.display = 'inline';
                    }
                })
                .each('end', function (d) {
                    if (d.parent !== focus && d.parent !== Object.getPrototypeOf(focus)) {
                        this.style.display = 'none';
                    }
                });
        }

        function zoomTo(v) {
            var k = diameter / v[2];
            view = v;
            node.attr('transform', function (d) {
                return 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')';
            });

            path.attr('d', function (d) {
                d.k = k;
                return arc(d);
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

        /**
         * After pack is applied we need to add pie information to each
         * node so path will be calculated properly.
         * to each node
         * @param nodes
         * @param pie
         */
        function addPieData(nodes, pie) {
            var newNodes = [];

            nodes.forEach(function (d) {
                    var pieData;

                    if (d.hasOwnProperty('sectors')) {
                        pieData = pie(d['sectors']);
                    } else {
                        // It's parent bubble and it doesn't have sectors
                        pieData = pie([1]);
                    }

                    pieData.forEach(function (node, i) {
                        var pieNode = Object.create(d);

                        for (var p in node) {
                            if (node.hasOwnProperty(p) && !d.hasOwnProperty(p)) {
                                pieNode[p] = node[p];
                            }
                        }
                        pieNode.slice = i;
                        newNodes.push(pieNode);
                    });
                }
            );

            return newNodes;
        }
    }
}());

