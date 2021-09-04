const canvas = document.getElementById("figure-3")
const ctx = canvas.getContext("2d")

const x = canvas.width / 2
const y = canvas.height / 2

ctx.strokeStyle = "#282828"
ctx.lineWidth = 4

ctx.fillStyle = "#f0dd3f"

ctx.beginPath()
ctx.moveTo(x, y)
ctx.arc(x, y, Math.min(x, y) * 0.9, 0, Math.PI * 2, false)
ctx.lineTo(x, y)
ctx.stroke()
ctx.fill()

ctx.fillStyle = "#282828"

ctx.beginPath()
ctx.moveTo(x-50, y-50)
ctx.arc(x-15, y-10, Math.min(x, y) * 0.7, 0, Math.PI * 2, false)
ctx.lineTo(x-50, y-50)
ctx.fill()
