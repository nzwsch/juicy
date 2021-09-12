const { DateTime } = require('luxon');
const fs = require('fs')
const path = require('path')

function main() {
  const now = DateTime.now().setZone('Asia/Tokyo')
  const fileDir = now.toFormat('yyyyMMdd')
  const blogPostDir = path.join(__dirname, "../content/blog/", fileDir)
  const blogPostPath = path.join(blogPostDir, "index.md")
  const blogPostBody = [
    '---',
    'title: "Hello World"',
    `date: "${now.toString()}"`,
    `description: "Hello World"`,
    '---'
  ].join("\n")

  fs.mkdirSync(blogPostDir)

  fs.writeFile(blogPostPath, blogPostBody, (err) => {
    if (err) throw err
    console.log(`${blogPostPath}`)
  })
}

main()
