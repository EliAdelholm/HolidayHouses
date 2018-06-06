/** Dependencies ************/
const express = require('express')
const app = express()
const mysql = require('mysql')
const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')
const mime = require('mime-types')
const bb = require('express-busboy');

// Options for busboy
bb.extend(app, {
  upload: true,
  path: '/path/to/save/files',
  allowedPath: /./,
});

/** Imports  ************/
const dbClass = require('./controllers/database.js')
const db = new dbClass

// Angular DIST output folder
app.use(express.static(path.join(__dirname, '../dist')));

/** sql connection ************/
const sqlConnection = require('./serverConnection')
global.con = mysql.createConnection(sqlConnection);

global.con.connect(function (err) {
  if (err) throw err;
  console.log("Connected to mysql!");
});

/** Server side routing  ************/

/** API  ************/

/** Get one user **/
app.get('/api/get-user', async (req, res) => {
  const iUserId = req.query.id
  const ajUsers = await db.getUser(iUserId)
  return res.send(ajUsers)
})

/** Create user **/
app.post('/api/create-user', async(req,res) => {
  const jUser = {
    name: req.body.userName,
    password: req.body.userPassword,
    email: req.body.userEmail
  }
  try {
    const response = await db.createUser(jUser)
    return res.send(response)
  } catch (e) {
    return res.send(`unable to create user`)
  }
})

/** Login **/
app.post('/api/login', async (req, res) => {
  const sUserEmail = req.body.email
  const sUserPassword = req.body.password
  try {
    const ajUsers = await db.loginUser(sUserEmail, sUserPassword)
    return res.send(ajUsers)
  } catch (e) {
    return res.status(500).send(e)
  }
})

/** Get details about one house house **/
app.get('/api/get-house', async (req, res) => {
  const iHouseId = req.query.id
  try {
    const jHouse = await db.getHouse(iHouseId);
    return res.send(jHouse)
  } catch (e) {
    return res.send(e)
  }
})

/** Get houses belonging to user **/
app.get('/api/get-houses-belonging-to-user', async(req,res) => {
  const iHouse = req.query.id
  try {
    const jHouse = await db.getHousesBelongingToUser(iHouse);
    return res.send(jHouse)
  } catch (e) {
    return res.send(e)
  }
});

app.post('/api/update-user' , async(req,res) => {
  const image = req.files.image
  if (image.mimetype.split('/')[0] !== 'image') {
    return res.send('The upload is not a valid image')
  }
  const jUser = {
    name: req.body.username,
    password: req.body.password,
    email: req.body.email,
    image: req.files.image
  }
  try {
    const jResult = await db.updateUser(jUser, req.body.id)
    // Generate new path, using timestamp to avoid duplication errors
    const timestamp = + new Date()
    const fileExtension = image.mimetype.split('/')[1]
    const filename = req.body.id +'-'+timestamp+'.'+fileExtension
    const targetPath = "src/assets/img/" + filename
    try {
      //image.file is the temp path
      fs.move(image.file, targetPath, function (err) {
        if (err) console.log(err);
      });
    } catch (e) {
      console.log(e)
    }
    return res.send(jResult)
  } catch (e) {
    return res.send(e)
  }
});

/** Get houses **/
app.get('/api/get-houses', async (req, res) => {
  const iNumberOfHouses = parseInt(req.query.number)
  try {
    const ajHouses = await db.getHouses(iNumberOfHouses)
    return res.send(ajHouses)
  } catch (e) {
    return res.send(e)
  }
})

/** Create house **/
app.post('/api/create-house' , async (req,res) => {
  /*const thumbnail = req.files.thumbnail
  if (thumbnail.mimetype.split('/')[0] !== 'image') {
    return res.send('The upload is not a valid image')
  }
  const fileExtension = thumbnail.mimetype.split('/')[1]
  const filename = thumbnail.uuid+'.'+fileExtension
  const targetPath = "src/assets/img/" + filename
  const thumbnailName ='thumbnail-'+thumbnail.uuid+'.'+fileExtension
  const thumbnailImagePath = 'src/assets/img/' + thumbnailName

  fs.move(thumbnail.file, targetPath, function (err) {
    if (err) {
      console.log (err);
      return false;
    }
    sharp(targetPath).resize(400,400).toFile(thumbnailImagePath).then(() => {
    }).catch((e) => { console.log(e) })
  });


  const aHouseImages = req.files.houseImages
  let aHouseImageNames = []
  aHouseImages.forEach((image) => {
    const fileExtension = image.mimetype.split('/')[1]
    const filename = req.body.userid +'-'+image.uuid+'.'+fileExtension
    const targetPath = "src/assets/img/" + filename
    aHouseImageNames.push([filename])
    fs.move(image.file, targetPath, function (err) {
      if (err) {
        console.log(err);
        return false;
      }
    })
  });*/

  const jHouse = {
    users_id: req.body.userId,
    thumbnail_image: 'test1.jpg',
    headline: req.body.headline,
    description: req.body.description,
    price: req.body.price,
    address: req.body.address,
    space: req.body.space,
    is_house: req.body.isHouse,
    wifi: req.body.hasWifi,
    familyfriendly: req.body.isFamilyFriendly,
    tv: req.body.hasTv,
    dryer: req.body.hasDryer
  }
  try {
    const response = await db.createHouse(jHouse, [['test1.jpg'], ['test2.jpg']])
    return res.json(response)
  } catch (e) {
    console.log('error saving house '+e)
    return res.status(500)
  }
})

app.get('/api/get-bookings', async (req,res) => {
  const iHouseId = req.query.id
  try {
    const response = await db.getBookings(iHouseId)
    // Define the function that will let us get dates between two dates
    const getDatesBetweenDates = function(startDate, endDate) {
      const aBookedDates = []
      let currentDate = startDate
      const addDays = function (days) {
        let date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
      };
      while (currentDate <= endDate) {
        aBookedDates.push(currentDate);
        currentDate = addDays.call(currentDate, 1);
      }
      aBookedDates.shift() // So it doesnt start a day early
      return aBookedDates;
    }

    // Add all the dates up
    let aTotalBookedDates = []
      response.forEach((booking) => {
        const startDate = booking.start_date
        const endDate = booking.end_date
        const aDatesBetween = getDatesBetweenDates(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
          new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()+1)) // +1 so it adds the end day as well
        const asDatesBetween = aDatesBetween.map((date) => { return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`})
        aTotalBookedDates = aTotalBookedDates.concat(asDatesBetween)
      })
      return res.send(aTotalBookedDates)
    } catch (e) {
      return res.status(500)
    }
  })

app.post('/api/create-booking', async (req, res) => {

  const sStartDate = `${req.body.startDate} 12:00:00`
  const sEndDate = `${req.body.endDate} 12:00:00`

  const jBooking = {
    users_id: req.body.userId,
    houses_id: req.body.houseId,
    start_date: sStartDate,
    end_date: sEndDate
  }

  try {
    const response = await db.createBooking(jBooking)
    return res.send(response)
  } catch(e) {
    console.log(`unable to save booking ${e}`)
    return res.send(e)
  }
})

// Send all other requests to the Angular app
app.get('*', (req, res) => {
  return res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/** Connection  ************/
app.listen(4000, (err) => {
  if (err) {
    console.log(err)
    return false
  }
  console.log('Server is listening to port 4000')
})
