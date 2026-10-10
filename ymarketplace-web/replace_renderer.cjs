const fs = require("fs");
const path = require("path");

const files = [];

files.forEach((file) => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");
    fs.writeFileSync(fullPath, content, "utf8");
    console.log("Processed", file);
  }
});
