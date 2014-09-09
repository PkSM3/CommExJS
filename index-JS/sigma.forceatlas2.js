// Mathieu Jacomy @ Sciences Po Médialab & WebAtlas
// (requires sigma.js to be loaded)
var nodesFA2;
var edgesFA2;


sigma.forceatlas2 = sigma.forceatlas2 || {};
sigma.forceatlas2.ForceAtlas2 = function() {
  sigma.classes.Cascade.call(this);
  var self = this;

  this.p = {
    linLogMode: false,
    outboundAttractionDistribution: false,
    adjustSizes: false,
    edgeWeightInfluence: 0,
    scalingRatio: 1,
    strongGravityMode: false,
    gravity: 1,
    jitterTolerance: 1,
    barnesHutOptimize: false,
    barnesHutTheta: 1.2,
    speed: 1,
    outboundAttCompensation: 1,
    totalSwinging: 0,
    swingVSnode1: 0,
    banderita: false,
    totalEffectiveTraction: 0,
    complexIntervals: 500,
    simpleIntervals: 1000,
    layoutHiddenNodes: true
  };

  // The state tracked from one atomic "go" to another
  this.state = {step: 0, index: 0};
  this.rootRegion;

  // Runtime (the ForceAtlas2 itself)
  this.init = function() {
    self.state = {step: 0, index: 0};

    nodesFA2.forEach(function(n) {
      if (self.p.layoutHiddenNodes || (!self.p.layoutHiddenNodes && !n.hidden)) {
        n.fa2 = {
          mass: 1 + n.degree,
          old_dx: 0,
          old_dy: 0,
          dx: 0,
          dy: 0
        };
      }
    });

    return self;
  }

  this.go = function() {
    while (self.atomicGo()) {}
  }

  this.atomicGo = function() {
      
    //pr(edgesFA2.length);
    var cInt = self.p.complexIntervals;
    var sInt = self.p.simpleIntervals;

    switch (self.state.step) {
      case 0: // Pass init
        // Initialise layout data
        nodesFA2.forEach(function(n) {
          if (self.p.layoutHiddenNodes || (!self.p.layoutHiddenNodes && !n.hidden)) {
            if(n.fa2) {
              n.fa2.mass = 1 + n.degree;
              n.fa2.old_dx = n.fa2.dx;
              n.fa2.old_dy = n.fa2.dy;
              n.fa2.dx = 0;
              n.fa2.dy = 0;
            } else {
              n.fa2 = {
                mass: 1 + n.degree,
                old_dx: 0,
                old_dy: 0,
                dx: 0,
                dy: 0
              };
            }
          }
        });

        // If Barnes Hut active, initialize root region
        if (self.p.barnesHutOptimize) {
          self.rootRegion = new sigma.forceatlas2.Region(nodesFA2, 0);
          self.rootRegion.buildSubRegions();
        }

        // If outboundAttractionDistribution active, compensate.
        if (self.p.outboundAttractionDistribution) {
          self.p.outboundAttCompensation = 0;
          nodesFA2.forEach(function(n) {
            self.p.outboundAttCompensation += n.fa2.mass;
          });
          self.p.outboundAttCompensation /= nodesFA2.length;
        }
        self.state.step = 1;
        self.state.index = 0;
        return true;
        break;

      case 1: // Repulsion
        var Repulsion = self.ForceFactory.buildRepulsion(
          self.p.adjustSizes,
          self.p.scalingRatio
        );

        if (self.p.barnesHutOptimize) {
          var rootRegion = self.rootRegion;

          // Pass to the scope of forEach
          var barnesHutTheta = self.p.barnesHutTheta;
          var i = self.state.index;
          while (i < nodesFA2.length && i < self.state.index + cInt) {
            var n = nodesFA2[i++];
            if(n.fa2)
              rootRegion.applyForce(n, Repulsion, barnesHutTheta);
          }
          if (i == nodesFA2.length) {
            self.state.step = 2;
            self.state.index = 0;
          } else {
            self.state.index = i;
          }
        } else {
          var i1 = self.state.index;
          while (i1 < nodesFA2.length && i1 < self.state.index + cInt) {
            var n1 = nodesFA2[i1++];
            if(n1.fa2)
              nodesFA2.forEach(function(n2, i2) {
                if (i2 < i1 && n2.fa2) {
                  Repulsion.apply_nn(n1, n2);
                }
              });
          }
          if (i1 == nodesFA2.length) {
            self.state.step = 2;
            self.state.index = 0;
          } else {
            self.state.index = i1;
          }
        }
        return true;
        break;

      case 2: // Gravity
        var Gravity = (self.p.strongGravityMode) ?
                      (self.ForceFactory.getStrongGravity(
                        self.p.scalingRatio
                      )) :
                      (self.ForceFactory.buildRepulsion(
                        self.p.adjustSizes,
                        self.p.scalingRatio
                      ));
        // Pass gravity and scalingRatio to the scope of the function
        var gravity = self.p.gravity,
        scalingRatio = self.p.scalingRatio;

        var i = self.state.index;
        while (i < nodesFA2.length && i < self.state.index + sInt) {
          var n = nodesFA2[i++];
          if (n.fa2)
            Gravity.apply_g(n, gravity / scalingRatio);
        }

        if (i == nodesFA2.length) {
          self.state.step = 3;
          self.state.index = 0;
        } else {
          self.state.index = i;
        }
        return true;
        break;

      case 3: // Attraction
        var Attraction = self.ForceFactory.buildAttraction(
          self.p.linLogMode,
          self.p.outboundAttractionDistribution,
          self.p.adjustSizes,
          1 * ((self.p.outboundAttractionDistribution) ?
            (self.p.outboundAttCompensation) :
            (1))
        );

        var i = self.state.index;
        if (self.p.edgeWeightInfluence == 0) {
          while (i < edgesFA2.length && i < self.state.index + cInt) {
            var e = edgesFA2[i++];
            Attraction.apply_nn(e.source, e.target, 1);
          }
        } else if (self.p.edgeWeightInfluence == 1) {
          while (i < edgesFA2.length && i < self.state.index + cInt) {
            var e = edgesFA2[i++];
            Attraction.apply_nn(e.source, e.target, e.weight || 1);
          }
        } else {
          while (i < edgesFA2.length && i < self.state.index + cInt) {
            var e = edgesFA2[i++];
            Attraction.apply_nn(
              e.source, e.target,
              Math.pow(e.weight || 1, self.p.edgeWeightInfluence)
            );
          }
        }

        if (i == edgesFA2.length) {
          self.state.step = 4;
          self.state.index = 0;
        } else {
          self.state.index = i;
        }

        return true;
        break;

      case 4: // Auto adjust speed
        var totalSwinging = 0;  // How much irregular movement
        var totalEffectiveTraction = 0;  // Hom much useful movement
        var swingingSum=0;
        var promdxdy=0;  /**/

        nodesFA2.forEach(function(n) {
          var fixed = n.fixed || false;
          if (!fixed && n.fa2) {
            var swinging = Math.sqrt(Math.pow(n.fa2.old_dx - n.fa2.dx, 2) +
                           Math.pow(n.fa2.old_dy - n.fa2.dy, 2));

            // If the node has a burst change of direction,
            // then it's not converging.
            totalSwinging += n.fa2.mass * swinging;
            swingingSum += swinging;
            promdxdy += (Math.abs(n.fa2.dx)+Math.abs(n.fa2.dy))/2; /**/
            totalEffectiveTraction += n.fa2.mass *
                                      0.5 *
                                      Math.sqrt(
                                        Math.pow(n.fa2.old_dx + n.fa2.dx, 2) +
                                        Math.pow(n.fa2.old_dy + n.fa2.dy, 2)
                                      );
          }
        });

        self.p.totalSwinging = totalSwinging;
        
        var convg= ((Math.pow(nodesFA2.length,2))/promdxdy);    /**/
        var swingingVSnodes_length = swingingSum/nodesFA2.length;     /**/
//        if(convg > swingingVSnodes_length){
//            if(numberOfDocs==nodesFA2.length){
//                socialConverged++;
//            }
//            if(numberOfNGrams==nodesFA2.length ){
//                semanticConverged++;
//            }
//            pr("\tI'm going to apply the stop criteria!");
//            partialGraph.stopForceAtlas2(); 
//        }
        
        self.p.totalEffectiveTraction = totalEffectiveTraction;

        // We want that swingingMovement < tolerance * convergenceMovement
        var targetSpeed = Math.pow(self.p.jitterTolerance, 2) *
                          self.p.totalEffectiveTraction /
                          self.p.totalSwinging;

        // But the speed shoudn't rise too much too quickly,
        // since it would make the convergence drop dramatically.
        var maxRise = 0.5;   // Max rise: 50%
        self.p.speed = self.p.speed +
                       Math.min(
                         targetSpeed - self.p.speed,
                         maxRise * self.p.speed
                       );

        // Save old coordinates
        nodesFA2.forEach(function(n) {
          n.old_x = +n.x;
          n.old_y = +n.y;
        });

        self.state.step = 5;
        return true;
        break;

      case 5: // Apply forces
        var i = self.state.index;
        if (self.p.adjustSizes) {
          var speed = self.p.speed;
          // If nodes overlap prevention is active,
          // it's not possible to trust the swinging mesure.
          while (i < nodesFA2.length && i < self.state.index + sInt) {
            var n = nodesFA2[i++];
            var fixed = n.fixed || false;
            if (!fixed && n.fa2) {
              // Adaptive auto-speed: the speed of each node is lowered
              // when the node swings.
              var swinging = Math.sqrt(
                (n.fa2.old_dx - n.fa2.dx) *
                (n.fa2.old_dx - n.fa2.dx) +
                (n.fa2.old_dy - n.fa2.dy) *
                (n.fa2.old_dy - n.fa2.dy)
              );
              var factor = 0.1 * speed / (1 + speed * Math.sqrt(swinging));

              var df = Math.sqrt(Math.pow(n.fa2.dx, 2) +
                       Math.pow(n.fa2.dy, 2));

              factor = Math.min(factor * df, 10) / df;

              n.x += n.fa2.dx * factor;
              n.y += n.fa2.dy * factor;
            }
          }
        } else {
          var speed = self.p.speed;
          while (i < nodesFA2.length && i < self.state.index + sInt) {
            var n = nodesFA2[i++];
            var fixed = n.fixed || false;
            if (!fixed && n.fa2) {
              // Adaptive auto-speed: the speed of each node is lowered
              // when the node swings.
              var swinging = Math.sqrt(
                (n.fa2.old_dx - n.fa2.dx) *
                (n.fa2.old_dx - n.fa2.dx) +
                (n.fa2.old_dy - n.fa2.dy) *
                (n.fa2.old_dy - n.fa2.dy)
              );
              var factor = speed / (1 + speed * Math.sqrt(swinging));

              n.x += n.fa2.dx * factor;
              n.y += n.fa2.dy * factor;
            }
          }
        }

        if (i == nodesFA2.length) {
          self.state.step = 0;
          self.state.index = 0;
          return false;
        } else {
          self.state.index = i;
          return true;
        }
        break;

      default:
        throw new Error('ForceAtlas2 - atomic state error');
        break;
    }
  }

  this.end = function() {
    nodesFA2.forEach(function(n) {
        if(!n.hidden){
            n.fa2 = null;
        }
    });
  }
  
  // Auto Settings
  this.setAutoSettings = function() {
    //var graph = this.graph;
    /*var graphnodes = nodes.filter(function(n) {
                        return !n['hidden'];
                    }).map(function(n) {
                        return n;
                    });*/

    // Tuning
    if (nodesFA2.length >= 100) {
      this.p.scalingRatio = 2.0;
    } else {
      this.p.scalingRatio = 10.0;
    }
    this.p.strongGravityMode = false;
    this.p.gravity = 1;

    // Behavior
    this.p.outboundAttractionDistribution = false;
    this.p.linLogMode = false;
    this.p.adjustSizes = false;
    this.p.edgeWeightInfluence = 1;

    // Performance
    if (nodesFA2.length >= 50000) {
      this.p.jitterTolerance = 10;
    } else if (nodesFA2.length >= 5000) {
      this.p.jitterTolerance = 1;
    } else {
      this.p.jitterTolerance = 0.1;
    }
    if (nodesFA2.length >= 1000) {
      this.p.barnesHutOptimize = true;
    } else {
      this.p.barnesHutOptimize = false;
    }
    this.p.barnesHutTheta = 1.2;

    return this;
  }

  // All the different forces
  this.ForceFactory = {
    buildRepulsion: function(adjustBySize, coefficient) {
      if (adjustBySize) {
        return new this.linRepulsion_antiCollision(coefficient);
      } else {
        return new this.linRepulsion(coefficient);
      }
    },

    getStrongGravity: function(coefficient) {
      return new this.strongGravity(coefficient);
    },

    buildAttraction: function(logAttr, distributedAttr, adjustBySize, c) {
      if (adjustBySize) {
        if (logAttr) {
          if (distributedAttr) {
            return new this.logAttraction_degreeDistributed_antiCollision(c);
          } else {
            return new this.logAttraction_antiCollision(c);
          }
        } else {
          if (distributedAttr) {
            return new this.linAttraction_degreeDistributed_antiCollision(c);
          } else {
            return new this.linAttraction_antiCollision(c);
          }
        }
      } else {
        if (logAttr) {
          if (distributedAttr) {
            return new this.logAttraction_degreeDistributed(c);
          } else {
            return new this.logAttraction(c);
          }
        } else {
          if (distributedAttr) {
            return new this.linAttraction_massDistributed(c);
          } else {
            return new this.linAttraction(c);
          }
        }
      }
    },

    // Repulsion force: Linear
    linRepulsion: function(c) {
      this.coefficient = c;
      this.apply_nn = function(n1, n2) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = this.coefficient *
                         n1.fa2.mass *
                         n2.fa2.mass /
                         Math.pow(distance, 2);

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }

      this.apply_nr = function(n, r) {
        // Get the distance
        var xDist = n.x - r.config('massCenterX');
        var yDist = n.y - r.config('massCenterY');
        var distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (distance > 0) {
          // NB: factor = force / distance
          var factor = this.coefficient *
                       n.fa2.mass *
                       r.config('mass') /
                       Math.pow(distance, 2);

          n.fa2.dx += xDist * factor;
          n.fa2.dy += yDist * factor;
        }
      }

      this.apply_g = function(n, g) {
        // Get the distance
        var xDist = n.x;
        var yDist = n.y;
        var distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (distance > 0) {
          // NB: factor = force / distance
          var factor = this.coefficient * n.fa2.mass * g / distance;

          n.fa2.dx -= xDist * factor;
          n.fa2.dy -= yDist * factor;
        }
      }
    },

    linRepulsion_antiCollision: function(c) {
      this.coefficient = c;
      this.apply_nn = function(n1, n2) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist) -
                         n1.size -
                         n2.size;

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = this.coefficient *
                         n1.fa2.mass *
                         n2.fa2.mass /
                         Math.pow(distance, 2);

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;

          } else if (distance < 0) {
            var factor = 100 * this.coefficient * n1.fa2.mass * n2.fa2.mass;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }

      this.apply_nr = function(n, r) {
        // Get the distance
        var xDist = n.fa2.x() - r.getMassCenterX();
        var yDist = n.fa2.y() - r.getMassCenterY();
        var distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (distance > 0) {
          // NB: factor = force / distance
          var factor = this.coefficient *
                       n.fa2.mass *
                       r.getMass() /
                       Math.pow(distance, 2);

          n.fa2.dx += xDist * factor;
          n.fa2.dy += yDist * factor;
        } else if (distance < 0) {
          var factor = -this.coefficient * n.fa2.mass * r.getMass() / distance;

          n.fa2.dx += xDist * factor;
          n.fa2.dy += yDist * factor;
        }
      }

      this.apply_g = function(n, g) {
        // Get the distance
        var xDist = n.x;
        var yDist = n.y;
        var distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (distance > 0) {
          // NB: factor = force / distance
          var factor = this.coefficient * n.fa2.mass * g / distance;

          n.fa2.dx -= xDist * factor;
          n.fa2.dy -= yDist * factor;
        }
      }
    },

    // Repulsion force: Strong Gravity
    // (as a Repulsion Force because it is easier)
    strongGravity: function(c) {
      this.coefficient = c;
      this.apply_nn = function(n1, n2) {
        // Not Relevant
      }
      this.apply_nr = function(n, r) {
        // Not Relevant
      }

      this.apply_g = function(n, g) {
        // Get the distance
        var xDist = n.x;
        var yDist = n.y;
        var distance = Math.sqrt(xDist * xDist + yDist * yDist);

        if (distance > 0) {
          // NB: factor = force / distance
          var factor = this.coefficient * n.fa2.mass * g;

          n.fa2.dx -= xDist * factor;
          n.fa2.dy -= yDist * factor;
        }
      }
    },

    // Attraction force: Linear
    linAttraction: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;

          // NB: factor = force / distance
          var factor = -this.coefficient * e;

          n1.fa2.dx += xDist * factor;
          n1.fa2.dy += yDist * factor;

          n2.fa2.dx -= xDist * factor;
          n2.fa2.dy -= yDist * factor;
        }
      }
    },


    // Attraction force: Linear, distributed by mass (typically, degree)
    linAttraction_massDistributed: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;

          // NB: factor = force / distance
          var factor = -this.coefficient * e / n1.fa2.mass;

          n1.fa2.dx += xDist * factor;
          n1.fa2.dy += yDist * factor;

          n2.fa2.dx -= xDist * factor;
          n2.fa2.dy -= yDist * factor;
        }
      }
    },


    // Attraction force: Logarithmic
    logAttraction: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient *
                         e *
                         Math.log(1 + distance) /
                         distance;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    },


    // Attraction force: Linear, distributed by Degree
    logAttraction_degreeDistributed: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient *
                         e *
                         Math.log(1 + distance) /
                         distance /
                         n1.fa2.mass;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    },


    // Attraction force: Linear, with Anti-Collision
    linAttraction_antiCollision: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient * e;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    },


    // Attraction force: Linear, distributed by Degree, with Anti-Collision
    linAttraction_degreeDistributed_antiCollision: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient * e / n1.fa2.mass;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    },


    // Attraction force: Logarithmic, with Anti-Collision
    logAttraction_antiCollision: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient *
                         e *
                         Math.log(1 + distance) /
                         distance;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    },

    // Attraction force: Linear, distributed by Degree, with Anti-Collision
    logAttraction_degreeDistributed_antiCollision: function(c) {
      this.coefficient = c;

      this.apply_nn = function(n1, n2, e) {
        if(n1.fa2 && n2.fa2)
        {
          // Get the distance
          var xDist = n1.x - n2.x;
          var yDist = n1.y - n2.y;
          var distance = Math.sqrt(xDist * xDist + yDist * yDist);

          if (distance > 0) {
            // NB: factor = force / distance
            var factor = -this.coefficient *
                         e *
                         Math.log(1 + distance) /
                         distance /
                         n1.fa2.mass;

            n1.fa2.dx += xDist * factor;
            n1.fa2.dy += yDist * factor;

            n2.fa2.dx -= xDist * factor;
            n2.fa2.dy -= yDist * factor;
          }
        }
      }
    }
  };
};
/*fromhere*/
// The Region class, as used by the Barnes Hut optimization
sigma.forceatlas2.Region = function(nodes, depth) {
  sigma.classes.Cascade.call(this);
  this.depthLimit = 20;
  this.size = 0;
  this.nodes = nodes;
  this.subregions = [];
  this.depth = depth;

  this.p = {
    mass: 0,
    massCenterX: 0,
    massCenterY: 0
  };
  
  this.updateMassAndGeometry();
}

sigma.forceatlas2.Region.prototype.updateMassAndGeometry = function() {
  if (this.nodes.length > 1) {
    // Compute Mass
    var mass = 0;
    var massSumX = 0;
    var massSumY = 0;
    this.nodes.forEach(function(n) {
      mass += n.fa2.mass;
      massSumX += n.x * n.fa2.mass;
      massSumY += n.y * n.fa2.mass;
    });
    var massCenterX = massSumX / mass;
    massCenterY = massSumY / mass;

    // Compute size
    var size;
    this.nodes.forEach(function(n) {
      var distance = Math.sqrt(
        (n.x - massCenterX) *
        (n.x - massCenterX) +
        (n.y - massCenterY) *
        (n.y - massCenterY)
      );
      size = Math.max(size || (2 * distance), 2 * distance);
    });

    this.p.mass = mass;
    this.p.massCenterX = massCenterX;
    this.p.massCenterY = massCenterY;
    this.size = size;
  }
};


sigma.forceatlas2.Region.prototype.buildSubRegions = function() {
  if (this.nodes.length > 1) {
    var leftNodes = [];
    var rightNodes = [];
    var subregions = [];
    var massCenterX = this.p.massCenterX;
    var massCenterY = this.p.massCenterY;
    var nextDepth = this.depth + 1;

    var self = this;

    this.nodes.forEach(function(n) {
      var nodesColumn = (n.x < massCenterX) ? (leftNodes) : (rightNodes);
      nodesColumn.push(n);
    });

    var tl = [], bl = [], br = [], tr = [];

    leftNodes.forEach(function(n) {
      var nodesLine = (n.y < massCenterY) ? (tl) : (bl);
      nodesLine.push(n);
    });

    rightNodes.forEach(function(n) {
      var nodesLine = (n.y < massCenterY) ? (tr) : (br);
      nodesLine.push(n);
    });

    [tl, bl, br, tr].filter(function(a) {
      return a.length;
    }).forEach(function(a) {
      if (nextDepth <= self.depthLimit && a.length < self.nodes.length) {
        var subregion = new sigma.forceatlas2.Region(a, nextDepth);
        subregions.push(subregion);
      } else {
        a.forEach(function(n) {
          var oneNodeList = [n];
          var subregion = new sigma.forceatlas2.Region(oneNodeList, nextDepth);
          subregions.push(subregion);
        });
      }
    });

    this.subregions = subregions;

    subregions.forEach(function(subregion) {
      subregion.buildSubRegions();
    });
  }
};

sigma.forceatlas2.Region.prototype.applyForce = function(n, Force, theta) {
  if (this.nodes.length < 2) {
    var regionNode = this.nodes[0];
    Force.apply_nn(n, regionNode);
  } else {
    var distance = Math.sqrt(
      (n.x - this.p.massCenterX) *
      (n.x - this.p.massCenterX) +
      (n.y - this.p.massCenterY) *
      (n.y - this.p.massCenterY)
    );

    if (distance * theta > this.size) {
      Force.apply_nr(n, this);
    } else {
      this.subregions.forEach(function(subregion) {
        subregion.applyForce(n, Force, theta);
      });
    }
  }
};

sigma.publicPrototype.startForceAtlas2 = function() {

  if(fa2enabled) {
      pr("\tStarting FA2");
      nodesFA2 = this._core.graph.nodes.filter(function(n) {
                    return !n['hidden'];
                });/*.map(function(n) {
                    return n;
                });*/
      edgesFA2 = this._core.graph.edges.filter(function(e) {
                    return !e['hidden'];
                });/*.map(function(e) {
                    return e;
                });*/
      pr("\t#nodes: "+nodesFA2.length);
      pr("\t#edges: "+edgesFA2.length);
      this.forceatlas2 = new sigma.forceatlas2.ForceAtlas2();
      this.forceatlas2.setAutoSettings();
      this.forceatlas2.init();
      //}
      $("#overviewzone").hide();
      this.addGenerator('forceatlas2', this.forceatlas2.atomicGo, function(){
        return true;
     });
  }
};

sigma.publicPrototype.stopForceAtlas2 = function() {
  this.removeGenerator('forceatlas2');
  pr("\tStopping FA2");
  updateMap();
  partialGraph.refresh();
  $("#overviewzone").show();
};
