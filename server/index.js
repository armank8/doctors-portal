const express = require('express');
const cors = require('cors');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// write nodemailer code here

// 

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@doctors-portal.tysjeor.mongodb.net/?retryWrites=true&w=majority&appName=doctors-portal`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lqjiz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt er function
function verifyJWT(req, res, next) {
  // console.log('abc');
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();


    // console.log(decoded) // bar
  });
}


async function run() {
  try {
    await client.connect();
    // console.log('Database connected');
    const serviceCollection = client.db('doctors_portal').collection('services');
    const bookingCollection = client.db('doctors_portal').collection('bookings');
    const userCollection = client.db('doctors_portal').collection('users');
    const doctorCollection = client.db('doctors_portal').collection('doctors');
    // console.log(serviceCollection);

    // admin verify
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    // get all users  // 
    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    // 
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    })

    // make a user admin
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      // const requester = req.decoded.email;
      // const requesterAccount = await userCollection.findOne({ email: requester });
      // if (requesterAccount.role === 'admin') {
      // const user = req.body;
      const filter = { email: email };
      // const options = { upsert: true };
      const updateDoc = {
        $set: { role: 'admin' },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send(result);
      // }
      // else {
      //   res.status(403).send({ message: 'forbidden' });
      // }

    });


    // update user //accessToken:
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      }
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    });

    // stripe set up backend
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    })


    // get all services
    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query).project({ name: 1 });
      const services = await cursor.toArray();
      res.send(services);
    });

    // Warning: 
    // this is not he proper way to query
    // after learning more about mongodb . Use aggregate lookup, pipeline, match, group 
    app.get('/available', async (req, res) => {
      const date = req.query.date || 'May 16, 2022';

      // step 1: get all services

      const services = await serviceCollection.find().toArray();
      // step 2: get the booking of that day.output: [{},{},{},{},{},{}]
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service, find bookings for that service
      services.forEach(service => {
        // step 4: find bookings for that service. Output : [{},{}, {},{} ]
        const serviceBookings = bookings.filter(book => book.treatment === service.name);

        // step 5: select slots for the servicebookings ['', '', '','']
        const bookedSlots = serviceBookings.map(book => book.slot);

        // step 6: select those slots that6 are not in bookedSlots

        // const booked = serviceBookings.map(s => s.slot);
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        // step 7: set available to slots to make it easier
        service.slots = available;

        // const booked =  serviceBookings.map(s=>s.slot);
        // service.booked = booked;
        // upper 2 lines in 1 line below
        // service.booked = serviceBookings.map(s=>s.slot);
      })

      res.send(services);
    })

    /**
     * API Naming Convention
     * app.get('/booking')  // get all bookings in this collection or get more than one or by filter
     * app.get('/booking/:id')  // get a specific booking
     * app.post('/booking')  // add a new booking
     * app.patch('/booking/:id')  // update a  booking
     * app.put('/booking/:id')  // upsert=> update(if exists) or insert (if doesn't exist)
     * app.delete('/booking/:id')  // delete a  booking
     */

    // get booking ///
    app.get('/booking', verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
        // const authorization = req.headers.authorization;
        // console.log('auth header', authorization);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    })

    // get a booking /// 
    app.get(`/booking/:id`, verifyJWT, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    })

    // get a doctor // 
    app.get('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
      const doctors = await doctorCollection.find().toArray();
      res.send(doctors);
    })

    // insert a doctor
    app.post('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    })

    // delete a doctor
    app.delete('/doctor/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      filter = { email: email }
      const result = await doctorCollection.deleteOne(filter);
      res.send(result);
    })


    app.post('/booking', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };

      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });


  }
  finally {

  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})