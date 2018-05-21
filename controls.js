var markdown = new showdown.Converter()
var log = console.log


updateBodySelection = (bodyId) => {

  if (bodyId && bodyId.length > 0) {
    if (!drag.showWords) {
      toggleWords()
    }
    var getDescription = () => {
      var o = galaxy.map.get(bodyId)



      var system = galaxy.systemGet(o)

      if (typeof (o) != "undefined") {
        var s = `## ${capitalise(details(o.id))}
${attributes(o.attributes)}`
        if (o.parentEntity != "sector") {
          s += `

### Parent ${details(o.parent)}`
        }

        if (o.children) {
          s += `
### Children:`

          for (c in o.children) {
            log()
            s += `
- <a onclick='updateBodySelection("${o.children[c].id}"); moveTowards("${o.children[c].id}")' bodyid='${o.children[c].id}'>${o.children[c].name}</a>`
          }
        }

        s += `

<a onclick='moveTowards("${system.id}")'>System ${system.x}-${system.y}</a>
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

- Change the detail options (systems, planets, satellites.)

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
    return `${type}: <a onclick='updateBodySelection("${o.id}")` +
      `;moveTowards("${o.id}")' bodyid='${o.id}'>${o.name}</a>${description}`
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

var moveTowards = (id) => {

  $("#optionSpeed").val(0)

  $("#optionSpeed").change()

  $("#optionLOD").val(Math.max(focus.detail, galaxy.get(id).depth))
  $("#optionLOD").change()

  var loc = Snap("#group" + id).transform().localMatrix
  moveToCoords(loc.e, loc.f, Math.pow(diminishingScale, 1.5 - galaxy.map.get(id).depth))
}

var moveToCoords = (x, y, z) => {
  drag.focusTarget = {
    x: x,
    y: y,
    z: z
  }
  drag.focusTime = 700
  drag.focusSpeed = Math.sqrt(Math.pow(focus.x - x, 2) + Math.pow(focus.y - y, 2)) / drag.focusTime
  drag.zoomSpeed = (z - focus.zoom) / drag.focusTime
  dirty()
}


var setFocus = (x, y) => {
  focus.x = constrain(-10, x, 110)
  focus.y = constrain(-10, y, 110)
  dirty()
}

var setZoom = (z) => {
  var range = 8
  var shift = 0
  if (z) {
    zz = constrain(1, z, 99)
    focus.zoom = Math.exp(Math.log(2) * range * (zz - 50) / 100 - shift)
  }
  $("#optionZoom")[0].value = (Math.log(focus.zoom) + shift) * 100 / (Math.log(2) * range) + 50
}

var dirty = () => {
  focus.dirty = true
}

var addSvgTouchHandlers = () => {

  var shiftFocus = (dx, dy) => {
    var size = $("#chart")[0].getBoundingClientRect()
    var canvasSize = Math.min(size.width, size.height)
    var x = constrain(0, focus.x - dx / (focus.zoom * canvasSize), galaxy.columns)
    var y = constrain(0, focus.y - dy / (focus.zoom * canvasSize), galaxy.rows)
    setFocus(x, y)
  }



  var setSpeed = (s) => {
    focus.speed = constrain(0, s, 5)
    $("#optionSpeed")[0].value = focus.speed
  }


  // Options menu

  $("#optionLOD").change(function (e) {
    focus.detail = parseInt($("#optionLOD")[0].value)
    dirty()
  })

  $("#optionLOD").change()



  $("#optionZoom").on("input", function (e) {
    setZoom(parseInt($("#optionZoom")[0].value))
  })
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
      var current = parseInt($("#optionZoom")[0].value)
      $("#optionZoom")[0].value = constrain(1, current + e.deltaY / 2, 99)
      $("#optionZoom").change()
      e.preventDefault()
      //$("#optionZoom").change()
      //console.log(event.deltaX, event.deltaY, event.deltaFactor)
    })
    .dblclick(function (e) {
      e.preventDefault()
      var x = e.pageX - $('#chart').offset().left
      var y = e.pageY - $('#chart').offset().top
      //moveTowards(x / mapSize, y / mapSize)
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
            var current = parseInt($("#optionZoom")[0].value)
            $("#optionZoom")[0].value = constrain(1, current + distYChange / 10, 99)
            $("#optionZoom").change()
          }
        }
      }
      drag.last = touches
    }

  )
}

var toggleWords = () => {
  dirty()
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


var gotoEvent = function (e) {
  log(e)
  updateBodySelection($(e.target).attr("bodyId"))
  moveTowards($(e.target).attr("bodyId"))
}

$(() => {

  var updateResults = () => {
    var maxResults = 50
    var input = $("#searchInput")[0].value
    var results = search(input)
    var listHolder = $("#searchResults")
    listHolder.empty()
    $("#searchResultsClose").hide()
    if (results.length > 0) {



      var resultsDivs = []

      for (var i = 0; i < Math.min(results.length, maxResults); i++) {
        var o = results[i][0]
        var a = results[i][1]
        var li = $("<li>")
        var name = $("<button>", {
          bodyId: o.id
        }).text(o.name).click(gotoEvent)
        li.append(name)
        if (a) {
          var sub = $("<p>").text(`${a}: ${o.attributes[a]}`)
          li.append(sub)
        }
        resultsDivs.push(li)
      }
      if (results.length > maxResults) {
        resultsDivs.push($("<li>").append($("<p>").text(`Showing first ${maxResults} results only.`)))
      }

      var ul = $("<ul>")
      resultsDivs.forEach(v => ul.append(v))
      listHolder.append(ul)
      $("#searchResultsClose").show()
    }
  }


  $("#searchInput").keyup(updateResults).change(updateResults)

  $("#searchInput")[0].value = ""
  $("#searchInput").change()

})

$(() => {
  $(window).resize(resizeHandler).on("rotationchange", resizeHandler)
  $("body").resize(resizeHandler)

  var resizeHandler = () => {
    dirty()
    log("resize")
  }

  $(window).on(
    "dragover",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  )
  $(window).on(
    "dragenter",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  )

  $(window).on("drop", (e) => {
    if (e.originalEvent.dataTransfer.files.length) {
      log(e)
      e.preventDefault();
      e.stopPropagation();
      var FR = new FileReader()
      FR.onload = (e2) => {
        loadData(JSON.parse(e2.target.result))
      }
      FR.readAsText(e.originalEvent.dataTransfer.files[0])
      hideDisclaimer()
    }
  })

  $("#fileUpload").change((e) => {
    var file = $("#fileUpload")[0].files[0]
    var FR = new FileReader()
    FR.onload = (e2) => {
      loadData(JSON.parse(e2.target.result))
      hideDisclaimer()
    }
    FR.readAsText(file)
  })

  $(".urlLoader").click((e) => {
    var url = $(e.target).attr("url")
    if (url.length > 0) {
      loadURL(url)
      hideDisclaimer()
    } else {
      $("#fileUpload").click()
    }
  })

  var hideDisclaimer = () => {
    $("#disclaimer").hide()
    $("#words").show()
    $("#wordsToggle").show()
  }


  $("#words").hide()
  $("#wordsToggle").hide()

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