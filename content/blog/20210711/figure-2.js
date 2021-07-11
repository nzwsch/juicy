const canvas = document.getElementById("figure-1")
const ctx = canvas.getContext("2d")

const colors = ["#ab4642", "#f7ca88", "#86c1b9", "#ba8baf"]
const data = [40, 27, 23, 10]

const x = canvas.width / 2
const y = canvas.height / 2

ctx.strokeStyle = "#282828"
ctx.lineWidth = 4

let start = 0
let end = 0

for (let i = 0; i < data.length; i++) {
  end += data[i]

  ctx.fillStyle = colors[i]

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.arc(x, y,
          Math.min(x, y) * 0.9,
          Math.PI * (start / 50 - 0.5),
          Math.PI * (end / 50 - 0.5),
          false)
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.fill()

  start += data[i]
}
