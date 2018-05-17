

var markdown = new showdown.Converter()
var log = console.log


updateBodySelection = (bodyId) => {

  if(bodyId && bodyId.length > 0){
  var getDescription = () => {
    var o = galaxy.map.get(bodyId)
  if(typeof(o) != "undefined"){
  var s =  `# ${details(o.id)}
${attributes(o.attributes)}`
console.log(o)
if(o.parentEntity != "sector"){
s += `
## Parent ${details(o.parent)}`
}
return s
  }
  }

  $(".details").show()
$("#detailsWords").html(markdown.makeHtml(getDescription()))
  } else {
    log("hiding")
    $(".details").hide()
  }

}

$(function(){
  var s = "# Click an object to show details."
  $("#detailsWords").html(markdown.makeHtml(s))
}())


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

var details = id => {
  function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  var o = galaxy.map.get(id)
  if (typeof (o) != "undefined") {
    var description = attributes.description || ""
    if (description.length > 0) {
      description = " (" + description + ")"
    }
    var type = spreadCamel(o.type)
    return `${capitalise(type)}: ${o.name}${description}`
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