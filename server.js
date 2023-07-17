require("dotenv").config()
const multer = require("multer")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const File = require("./models/File")
const fs = require('fs');
const express = require("express")
const app = express()
app.use(express.urlencoded({ extended: true }))

const upload = multer({ dest: "uploads" })

mongoose.connect(process.env.DATABASE_URL)

app.set("view engine", "ejs")

async function DeleteFile(filePath) {
  await fs.unlinkSync(`${filePath}`)
}


app.get("/", (req, res) => {
  res.render("index")
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {

    let fileObject = {
      path: req.file.path,
      orignalName: req.file.originalname
    }
    console.log(req.file.originalname);
    //store password hash if password
    if (req.body.password != null || req.body.password !== '') {
      fileObject.password = await bcrypt.hash(req.body.password, 10);
    }


    //store info on db
    let result = await File.create(fileObject);


    //redirect to '/' with file-link
    res.render('index', { filelink: `${req.headers.origin}/file/${result.id}` })

  } catch (err) {
    res.send(err);
  }
})

//create download file link API 
app.route('/file/:id').get(filedownloadhandle).post(filedownloadhandle)


async function filedownloadhandle(req, res) {
  try {
    let id = req.params.id;
    let file = await File.findById(id);
    if (file.password != null) {
      if (req.body.password == null) {
        res.render("password")
        return
      }

      if (!(await bcrypt.compare(req.body.password, file.password))) {
        res.render("password", { error: true })
        return
      }
    }

    file.count++;
    await file.save();
    console.log(file);
    res.download(file.path, file.orignalName);


  } catch (err) {
    res.send(err);
  }
}


// another route to see all files avaible online
app.get("/list", async (req, res) => {
  try {
    let links = await File.find({});
    res.render("list", { links: links })
  } catch (err) {
    res.send(err);
  }
})


// route to delete some of files {post} part
app.get("/delete/:id", async (req, res) => {
  try {
    let id = req.params.id;
    console.log(id);
    let doc = await File.findById(id);
    DeleteFile(doc.path);
    await File.findByIdAndDelete({ _id: id });

    res.redirect("/list");
  } catch (err) {
    res.send(err);
  }
})


app.listen(process.env.PORT, () => {
  console.log('[+] Server restarted 😋');
})
