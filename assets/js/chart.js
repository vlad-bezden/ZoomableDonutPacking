/**
 * Created by Vlad Bezden on 8/6/2015.
 */

var zoomableDonutPackingChart = (function () {
    'use strict';

    var _chart = {},
        _diameter = 800,
        _margin = 20,
        _padding = 2,
        _donutSize = 20,
        _root = [],
        _focus,
        _svg,
        _nodes,
        _view,
        _pieDataProperty = 'sectors',
        _path,
        _bubbleColors;

    var _pieColors = d3.scale.category20();

    _chart.render = function () {
        if (!_svg) {
            _svg = d3.select('body')
                .append('svg')
                .attr('width', _diameter)
                .attr('height', _diameter)
                .append('g')
                .attr('transform', 'translate(' + _diameter / 2 + ',' + _diameter / 2 + ')');
        }
        renderBody(_svg);
    };

    function renderBody(svg) {
        var pack = d3.layout.pack()
            .padding(_padding)
            .size([_diameter, _diameter])
            .value(function (d) {
                return d.size;
            });

        var pie = d3.layout.pie()
            .value(function (d) {
                return d;
            })
            .sort(null);

        var arc = d3.svg.arc()
            .innerRadius(function (d) {
                return d.r * d.k - _donutSize;
            })
            .outerRadius(function (d) {
                return d.r * d.k;
            });

        createNodes(pack, pie);
        renderNodes(svg, arc);
    }

    function createNodes(pack, pie) {
        /**
         * After pack is applied we need to add pie information to each
         * node so path will be calculated properly.
         * to each node
         * @param nodes
         * @param pie
         */
        var addPieData = function (nodes, pie) {
            var newNodes = [];

            nodes.forEach(function (d) {
                    var pieNodes;

                    if (d.hasOwnProperty(_pieDataProperty)) {
                        pieNodes = pie(d[_pieDataProperty]);
                    } else {
                        // It's parent bubble and it doesn't have sectors
                        pieNodes = pie([1]);
                    }

                    pieNodes.forEach(function (node, i) {
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
        };

        var packNodes = pack.nodes(_root);
        _nodes = addPieData(packNodes, pie);
        _focus = _root;
    }

    function renderNodes(svg, arc) {
        if (!_bubbleColors) {
            _bubbleColors = bubbleColors();
        }

        _path = svg.selectAll('g.bubble')
            .data(_nodes)
            .enter()
            .append('g')
            .attr('class', 'bubble')
            .append('path')
            .attr('class', function (d) {
                return d.parent ? d.children ? 'node' : 'node node--leaf' : 'node node--root';
            })
            .style('fill', function (d) {
                return d.children ? _bubbleColors(d.depth) : _pieColors(d.slice);
            })
            .on('click', function (d) {
                if (_focus !== d) {
                    zoom(d);
                    d3.event.stopPropagation();
                }
            });

        renderText(svg);

        var node = svg.selectAll('.bubble,text');

        d3.select('body')
            .on('click', function () {
                zoom(_root);
            });

        zoomTo([_root.x, _root.y, _root.r * 2 + _margin]);

        function zoom(d) {
            _focus = d;

            var transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween('zoom', function () {
                    var i = d3.interpolateZoom(_view, [_focus.x, _focus.y, _focus.r * 2 + _margin]);
                    return function (t) {
                        zoomTo(i(t));
                    };
                });

            transition.selectAll('text')
                .filter(function (d) {
                    // returning false will keep label on and true will filter it out
                    return d.parent === _focus
                        || d.parent === Object.getPrototypeOf(_focus)
                        || this.style.display === 'inline';
                })
                .style('fill-opacity', function (d) {
                    return d.parent === _focus || d.parent === Object.getPrototypeOf(_focus) ? 1 : 0;
                })
                .each('start', function (d) {
                    if (d.parent === _focus || d.parent === Object.getPrototypeOf(_focus)) {
                        this.style.display = 'inline';
                    }
                })
                .each('end', function (d) {
                    if (d.parent !== _focus && d.parent !== Object.getPrototypeOf(_focus)) {
                        this.style.display = 'none';
                    }
                });
        }

        function zoomTo(v) {
            var k = _diameter / v[2];
            _view = v;
            node.attr('transform', function (d) {
                return 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')';
            });

            _path.attr('d', function (d) {
                d.k = k;
                return arc(d);
            });
        }
    }

    function renderText(svg) {
        svg.selectAll('text')
            .data(_nodes)
            .enter()
            .append('text')
            .attr('class', 'label')
            .style('fill-opacity', function (d) {
                return d.parent === _root ? 1 : 0;
            })
            .style('display', function (d) {
                return d.parent === _root ? null : 'none';
            })
            .text(function (d) {
                return d.name;
            });
    }

    /**
     * Creates outer bubbles color scale
     */
    function bubbleColors() {
        /**
         * Counts JSON graph depth
         * @param {object} branch
         * @return {Number} object graph depth
         */
        var depthCount = function (branch) {
            if (!branch.children) {
                return 1;
            }
            return 1 + d3.max(branch.children.map(depthCount));
        };

        return d3.scale.linear()
            .domain([0, depthCount(_root)])
            .range(['hsl(152,80%,80%)', 'hsl(228,30%,40%)'])
            .interpolate(d3.interpolateHcl);
    }

    // Accessor functions for the color, size, data ...

    /**
     * Color model for leaf nodes. By default it's using category20
     * @param {Function} c - function callback for color model of leaf nodes
     * @returns {object} - chart for method chaining
     */
    _chart.pieColors = function (c) {
        if (!arguments.length) {
            return _pieColors;
        }
        _pieColors = c;
        return _chart;
    };

    /**
     * Color model for bubble nodes. By defaults it's using linear interpolateHcl
     * @param {Function} c - function callback for color model of bubble nodes
     * @returns {Object} - chart for method chaining
     */
    _chart.bubbleColors = function (c) {
        if (!arguments.length) {
            return _bubbleColors;
        }
        _bubbleColors = c;
        return _chart;
    };

    /**
     * Thickness of the donut . By default it's 20px
     * @param {Number} s - thickness of the donut
     * @returns {Object} - chart for method chaining
     */
    _chart.donutSize = function (s) {
        if (!arguments.length) {
            return _donutSize;
        }
        _donutSize = s;
        return _chart;
    };

    /**
     * Diameter of the chart. By default it's 800px
     * @param {Number} d - diameter of the outer bubble
     * @returns {Object} - chart for method chaining
     */
    _chart.diameter = function (d) {
        if (!arguments.length) {
            return _diameter;
        }
        _diameter = d;
        return _chart;
    };

    /**
     * Margin size for the outer bubble. By default it's 20px
     * @param {Number} m - size of the margin
     * @returns {Object} - chart for method chaining
     */
    _chart.margin = function (m) {
        if (!arguments.length) {
            return _margin;
        }
        _margin = m;
        return _chart;
    };

    /**
     * Padding size between each bubble/circle. By default it's 2px
     * @param {Number} p - size of the padding
     * @returns {Object} - chart for method chaining
     */
    _chart.padding = function (p) {
        if (!arguments.length) {
            return _padding;
        }
        _padding = p;
        return _chart;
    };

    /**
     * Name of the property that contains pie data. By default it's 'sectors'
     * @param {String} s - sector name
     * @returns {Object} - chart for method chaining
     */
    _chart.sectors = function (s) {
        if (!arguments.length) {
            return _pieDataProperty;
        }
        _pieDataProperty = p;
        return _chart;
    };

    /**
     * Sets the data for the chart
     * @param {Object} d - hierarchical data
     * @returns {Object} - chart for method chaining
     */
    _chart.data = function (d) {
        if (!arguments.length) {
            return _root;
        }
        _root = d;
        return _chart;
    };

    return _chart;
}());
