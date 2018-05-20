var markdown = new showdown.Converter()
var log = console.log


updateBodySelection = (bodyId) => {

  if (bodyId && bodyId.length > 0) {
    if (!drag.showWords) {
      toggleWords()
    }
    var getDescription = () => {
      var o = galaxy.map.get(bodyId)

      var systemGet = body => {
        if (body.parentEntity == "sector") {
          return {
            x: body.x,
            y: body.y
          }
        } else {
          return systemGet(galaxy.map.get(body.parent))
        }
      }

      var system = systemGet(o)

      if (typeof (o) != "undefined") {
        var s = `## ${capitalise(details(o.id))}
${attributes(o.attributes)}`
        if (o.parentEntity != "sector") {
          s += `

### Parent ${details(o.parent)}`
        }
        s += `
### (System ${system.x}-${system.y})
        `
        return s
      }
    }

    $("#details").show()
    $("#detailsWords").html(markdown.makeHtml(getDescription()))
  } else {
    $("#details").hide()
  }

}

$(function () {
  var s = `
- Click an object to show details.
  
- Drag the map around.

- Change the detail options (systems, planets, satellits.)

- Click the House Triangulum logo to hide the option panel.`
  $("#detailsWords").html(markdown.makeHtml(s))
})


var spreadCamel = s => {

  var dSpreadCamel = s => {
    if (typeof (s) == "string") {
      return s.replace(/([a-z])([A-Z])/g, function (m, a, b) {
        return `${a} ${b.toLowerCase()}`
      })
    } else {
      var t = []
      s.forEach(x => t.push(dSpreadCamel(x)))
      return t.join(", ")
    }
  }

  return dSpreadCamel(s)
}



function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

var details = id => {

  var o = galaxy.map.get(id)
  if (typeof (o) != "undefined") {
    var description = attributes.description || ""
    if (description.length > 0) {
      description = " (" + description + ")"
    }
    var type = spreadCamel(o.type)
    return `${type}: ${o.name}${description}`
  } else {
    return ``
  }
}

var attributes = a => {

  var attr = a || {}
  var s = ""
  for (var key in a) {
    s += `- ${spreadCamel(key)}: ${spreadCamel(a[key])}\n`
  }
  return s
}



// scroll blocking from https://stackoverflow.com/questions/3957017/jquery-if-target-is-child-of-wrapper-then-do-something

var drag = {
  blockScroll: false,
  last: null,
  oldDetail: null,
  showWords: true
}

var constrain = (min, val, max) => {
  if (val === NaN) {
    val = 0
  }
  return Math.min(Math.max(min, val), max)
}


var moveTowards = (x, y) => {
  log(`${x} - ${y}`)
  drag.focusTarget = {
    x: x,
    y: y
  }
  drag.focusTime = 1000
  drag.focusSpeed = Math.sqrt(Math.pow(focus.x - x, 2) + Math.pow(focus.y - y, 2)) / drag.focusTime
}


var setFocus = (x, y) => {
  focus.x = constrain(0, x, 100)
  focus.y = constrain(0, y, 100)
}

var addSvgTouchHandlers = () => {

  var shiftFocus = (dx, dy) => {
    var size = $("#chart")[0].getBoundingClientRect()
    var svgSize = Math.min(size.width, size.height)
    var x = constrain(0, focus.x - 20 * (100 / focus.zoom) * (dx / svgSize), 100)
    var y = constrain(0, focus.y - 20 * (100 / focus.zoom) * (dy / svgSize), 100)
    setFocus(x, y)
  }



  var setZoom = (z) => {
    focus.zoom = constrain(20, z, 95)
    $("#optionZoom")[0].value = focus.zoom
  }

  var setSpeed = (s) => {
    focus.speed = constrain(0, s, 5)
    $("#optionSpeed")[0].value = focus.speed
  }


  // Options menu

  $("#optionLOD").change(function (e) {
    focus.detail = parseInt($("#optionLOD")[0].value)
  })

  $("#optionLOD").change()



  $("#optionZoom").change(function (e) {
    setZoom(parseInt($("#optionZoom")[0].value))
  })

  $("#optionZoom").change()


  $("#optionSpeed").change(function (e) {
    setSpeed(parseInt($("#optionSpeed")[0].value))
  })

  $("#optionSpeed").change()

  // Touch and drag

  $("svg")
    .mousedown(function (e) {
      drag.blockScroll = true
      drag.last = {
        x: e.pageX,
        y: e.pageY
      };
    })
    .mousemove(function (e) {
      var last = drag.last
      var next = {
        x: e.pageX,
        y: e.pageY
      }

      if (drag.blockScroll) {
        e.preventDefault();
        shiftFocus(next.x - last.x, next.y - last.y)
      }


      drag.last = {
        x: e.pageX,
        y: e.pageY
      }
    })
    .mouseup(function (e) {
      drag.blockScroll = false
    })
    .mousewheel(function (e) {
      setZoom(focus.zoom - e.deltaY / 5)
      e.preventDefault()
      //console.log(event.deltaX, event.deltaY, event.deltaFactor)
    })
    .dblclick(function (e) {
      e.preventDefault()
      var x = e.pageX - $('#chart').offset().left
      var y = e.pageY - $('#chart').offset().top
      //moveTowards( 100 * x / mapSize,  100 * y / mapSize)
    })


  $("svg").on('touchstart', function (e) {
    drag.blockScroll = true;
    var touches = e.targetTouches
    drag.last = e.touches
    //drag.oldDetail = focus.detail
    //focus.detail = 2
  });
  $("svg").on('touchend', function () {
    drag.blockScroll = false;
    // Not firing on multitouch end :(
    //focus.detail = drag.oldDetail
  });
  $("svg").on('touchmove', function (e) {
      var touches = e.targetTouches
      var last = drag.last
      if (drag.blockScroll) {
        e.preventDefault();

        if (last.length == touches.length) {
          if (last.length == 1) {
            var diff = {
              x: last[0].pageX - touches[0].pageX,
              y: last[0].pageY - touches[0].pageY
            }
            shiftFocus(-diff.x, -diff.y)
          }

          if (last.length == 2) {
            avgYChange = (last[0].pageY + last[1].pageY - touches[0].pageY - touches[1].pageY) / 2
            distYChange = Math.abs(touches[1].pageY - touches[0].pageY) - Math.abs(last[1].pageY - last[0].pageY)
            setZoom(focus.zoom + distYChange / 10)
          }
        }
      }
      drag.last = touches
    }

  )
}

var toggleWords = () => {
  drag.showWords = !drag.showWords


  var wordsToggle = Snap("#wordsToggle > svg")
  wordsToggle.animate({
    transform: ((wordsToggle.transform().localMatrix).rotate(180))
  }, 100)

  if (drag.showWords) {
    $("#words").show()
  } else {
    $("#words").hide()
  }
}

$(function () {

  var wordsToggle = Snap("#wordsToggle > svg").attr({
    viewBox: "0,0,1,1"
  })

  wordsToggle.circle(0.5, 0.5, 0.5).attr({
    fill: "orange"
  })
  var p6 = Math.PI / 6
  var BL = {
    x: 0.5 - 0.4 * Math.cos(p6),
    y: 0.5 + 0.4 * Math.sin(p6)
  }
  var BR = {
    x: 0.5 + 0.4 * Math.cos(p6),
    y: 0.5 + 0.4 * Math.sin(p6)
  }
  var T = {
    x: 0.5,
    y: 0.1
  }
  var triangle = wordsToggle
    .path(`M${BR.x},${BR.y} L${T.x},${T.y} L${BL.x},${BL.y}Z M${T.x},${T.y} L${T.x},${BR.y}`)
    .attr({
      stroke: "white",
      fill: "orange",
      "stroke-width": 0.03
    })

  $("#wordsToggle > svg").click(function (e) {
    toggleWords()
  })
})

$(() => {

  $("#searchInput").change(() => {
    var maxResults = 10
    var input = $("#searchInput")[0].value
    var results = search(input)
    var listHolder = $("#searchResults")
    listHolder.empty()
    $("#searchResultsClose").hide()
    if(results.length > 0){


    var goto = function (e) {
      updateBodySelection($(e.target).attr("bodyId"))
    }

    var resultsDivs = []

    for (var i = 0; i < Math.min(results.length, maxResults); i++) {
      var o = results[i][0]
      var a = results[i][1]
      var li = $("<li>")
      var name = $("<a>", {
        bodyId: o.id
      }).text(o.name).click(goto)
      li.append(name)
      if (a) {
        var sub = $("<p>").text(`${a}: ${o.attributes[a]}`)
        li.append(sub)
      }
      resultsDivs.push(li)
    }
    if (results.length > maxResults) {
      resultsDiv.push($("<li>").append($("<p>").text(`Showing first ${maxResults} results only.`)))
    }

    var ul = $("<ul>")
    resultsDivs.forEach(v => ul.append(v))
    listHolder.append(ul)
    $("#searchResultsClose").show()
    listHolder.append(hideMessage)
  } 
  })

  $("#searchInput")[0].value = "";$("#searchInput").change()

})

var search = s => {
  var results = []
  if (s.length > 0) {
    var m = new RegExp(s, "i")

    var searchRecursive = o => {
      if (o.name.match(m)) results.push([o, ""])
      if (o.attributes) {
        for (attr in o.attributes) {
          if (o.attributes[attr].toString().match(m)) results.push([o, attr])
        }
      }
      if (o.children) o.children.forEach(searchRecursive)
    }

    searchRecursive(galaxy)
  }
  return results

}