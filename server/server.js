/** Dependencies ************/
const express = require('express')
const app = express()
const mysql = require('mysql')
const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')
const mime = require('mime-types')
const bodyParser =  require('body-parser')
const decodeAndSaveImage = require('./controllers/decodeBase64')

// Use BodyParser
app.use(bodyParser.json({limit: '50mb'}))

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

app.get('/api/test-image' , async (req,res) => {
  const base64image = req.body.image
  try {
    const imageName = await decodeAndSaveImage(base64image, true)
    return res.send(`Success! Image saved with name: ${imageName}`)
  } catch (e) {
    return res.send(e)
  }
})

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
  if (req.body.userImg) {
    try{
      const response = await decodeAndSaveImage(req.body.userImg)
    } catch(e) {
      console.log('unable to upload user image')
      return res.send('unable to upload user image')
    }
  }
  try {
    const response = await db.createUser(jUser)
    return res.send(response)
  } catch (e) {
    return res.send(`unable to create user`)
  }
})

app.get('/api/delete-user' , async (req,res) => {
  const iUserId = req.query.id
  try {
    const response = await db.deleteUser(iUserId)
    return res.send('User deleted')
  } catch (e) {
    return res.send(`error deleting user ${e}`)
  }
})

app.get('/api/delete-house' , async(req,res) => {
  const iHouseId = req.query.id
  try {
    const response = await db.deleteHouse(iHouseId)
    return res.json({id: iHouseId})
  } catch (e) {
    return res.send(`error deleting house ${e}`)
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

/** Get details about one house **/
app.get('/api/get-house', async (req, res) => {
  const iHouseId = req.query.id
  try {
    const jHouse = await db.getHouse(iHouseId)
    return res.send(jHouse)
  } catch (e) {
    return res.send(e)
  }
})

/** Get houses belonging to user **/
app.get('/api/get-houses-belonging-to-user', async(req,res) => {
  const iHouse = req.query.id
  try {
    const ajHouses = await db.getHousesBelongingToUser(iHouse);
    ajHouses.forEach((house) =>{
      house.additional_images = house.additional_images.split(',')
    })
    return res.send(ajHouses)
  } catch (e) {
    return res.send(e)
  }
});

app.post('/api/update-house', async(req,res) => {
  const iHouseId = req.body.id
  const jHouse = {}
  jHouse.headline = req.body.headline
  jHouse.description = req.body.description
  jHouse.price = req.body.price
  jHouse.address = req.body.address
  jHouse.space = req.body.space
  jHouse.is_house = req.body.isHouse
  jHouse.wifi = req.body.hasWifi
  jHouse.tv = req.body.hasTv
  jHouse.dryer = req.body.hasDryer
  jHouse.familyfriendly = req.body.isFamilyFriendly

  let thumbnailName
  if (req.body.houseThumbnail) {
    thumbnailName = await decodeAndSaveImage(req.body.houseThumbnail, true).catch((e) => {
      console.log(`error saving thumbnail ${e}`)
      return res.send(`error saving thumbnail ${e}`)
    })
    jHouse.thumbnail_image = `thumbnail-${thumbnailName}`
  }

  const imagesToDelete = req.body.imagesToDelete
  const imagesToUpload = req.body.imagesToUpload
  let imagesToInsertInDb = thumbnailName ? [[iHouseId, thumbnailName]] : []
  if(imagesToUpload) {
    let imageName = ''
    let requests = imagesToUpload.reduce((promiseChain, item) => {
      return promiseChain.then(() => new Promise((resolve) => {
        decodeAndSaveImage(item).then((filename) => {
          imagesToInsertInDb.push([iHouseId, filename])
          resolve()
        }).catch((e) => {
          console.log(e)
          reject()
        })
      }));
    }, Promise.resolve());

    // If there's additional images to save, we need to wait for the decoding to get the names before we can save
    requests.then( async () => {
        try {
          const response = await db.updateHouse(iHouseId, jHouse, imagesToDelete, imagesToInsertInDb)
          const newHouse = await db.getHouse(iHouseId)
          return res.json(newHouse)
        } catch (e) {
          console.log(`error updating house ${e}`)
          return res.send(`error updating house ${e}`)
        }
    }
      ).catch((e) => { console.log (e) })
  }
  else {
    try {
      const response = await db.updateHouse(iHouseId, jHouse, imagesToDelete, imagesToInsertInDb)
      const newHouse = await db.getHouse(iHouseId)
      return res.json(newHouse)
    } catch (e) {
      console.log(`error updating house ${e}`)
      return res.send(`error updating house ${e}`)
    }
  }
})

app.post('/api/update-user' , async(req,res) => {
  let jUser = {
    name: req.body.username,
    password: req.body.password,
    email: req.body.email
  }
  if (req.body.image) {
    const image = req.body.image
    const imageName = await decodeAndSaveImage(image).catch((e) => {
      console.log(`exception in decodeBase64 ${e}`)
      return res.send(`unable to upload image ${e}`)
    })
    jUser.image = imageName
  }
  try {
    const jResult = await db.updateUser(jUser, req.body.id)
    return res.json({status: 'success', newUser: jUser})
  } catch (e) {
    return res.send(e)
  }
});

/** Get houses **/
app.get('/api/get-houses', async (req, res) => {
  const iNumberOfHouses = parseInt(req.query.number)
  try {
    const ajHouses = await db.getHouses(iNumberOfHouses)
    ajHouses.forEach((house) => {
      house.images = house.images.split(',')
    })
    return res.send(ajHouses)
  } catch (e) {
    return res.send(e)
  }
})

/** Create house **/
app.post('/api/create-house' , async (req,res) => {
  const thumbnail = req.body.houseThumbnail
  const thumbnailName = await decodeAndSaveImage(thumbnail, true).catch((e) => {
    console.log(`Exception in decodeBase64 ${e}`)
    return res.send(e)
  })
  let aImageNames = [[thumbnailName]]
  const aImages = req.body.houseImages

  let requests = aImages.reduce((promiseChain, item) => {
    return promiseChain.then(() => new Promise((resolve) => {
      decodeAndSaveImage(item).then((filename) => {
        aImageNames.push([filename])
        resolve()
      }).catch((e) => {
        console.log(e)
        reject()
      })
    }));
  }, Promise.resolve());

  requests.then( async () => {
    console.log('images uploaded')
    const jHouse = {
      users_id: req.body.userId,
      thumbnail_image: `thumbnail-${thumbnailName}`,
      headline: req.body.headline,
      description: req.body.description,
      price: req.body.price,
      address: req.body.address,
      space: req.body.space,
      is_house: req.body.isHouse,
      wifi: req.body.wifi,
      familyfriendly: req.body.familyfriendly,
      tv: req.body.tv,
      dryer: req.body.dryer
    }

    try {
      const createdHouse = await db.createHouse(jHouse, aImageNames)
      let newImages = []
      // remove the ids from the createdHouse before returning it
      for (let i=0; i < createdHouse.images.length; i++) {
        newImages.push(createdHouse.images[i][1])
      }
      createdHouse.is_house = JSON.parse(createdHouse.is_house)
      createdHouse.images = newImages
      return res.json(createdHouse)
    } catch (e) {
      console.log('error saving house '+e)
      return res.status(500)
    }
  }).catch((e) => { console.log (e) })


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
      return aBookedDates;
    }

    const addLeadingZero = (iNumber) => {
      if (iNumber < 10) {
        return `0${iNumber}`
      }
      return iNumber
    }
    // Add all the dates up
    let aTotalBookedDates = []
    response.forEach((booking) => {
      const startDate = booking.start_date
      const endDate = booking.end_date
      const aDatesBetween = getDatesBetweenDates(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
        new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())) // +1 so it adds the end day as well
      const asDatesBetween = aDatesBetween.map((date) => {
        return `${date.getFullYear()}-${addLeadingZero(date.getMonth()+1)}-${addLeadingZero(date.getDate())}`
      })
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
    return res.json({ status: 'OK'})
  } catch(e) {
    console.log(`unable to save booking ${e}`)
    return res.json({ status: 'Unable to save booking'})
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
