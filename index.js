const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


// middleware

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cmmcrj9.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("bistrodb").collection("menu")
    const reviewsCollection = client.db("bistrodb").collection("review")
    const cartCollection = client.db("bistrodb").collection("carts")
    const userCollection = client.db("bistrodb").collection("users")
    const paymentCollection = client.db("bistrodb").collection("payments")

    // JWT TOKENS
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middleWares token jwt

    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

// menu collection

    app.get('/menu', async(req,res) =>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })
    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    })
    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }

      const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
    app.post('/menu', verifyToken,verifyAdmin, async(req,res) =>{
        const item = req.body
        const result = await menuCollection.insertOne(item)
        res.send(result)
    })
    app.get('/review', async(req,res) =>{
        const result = await reviewsCollection.find().toArray()
        res.send(result)
    })
    // carts collections

    app.get('/carts', async(req,res)=>{
      const email = req.query.email;
      const query = {email: email}
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/carts' , async(req,res)=>{
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })
    app.delete('/carts/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query)
      res.send(result) 
    })
    // user collection
    

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })
    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc)
      res.send(result)
    })
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    


    app.get('/users', verifyToken,verifyAdmin, async(req,res) =>{
      const result = await userCollection.find().toArray()
      res.send(result)
  })
  app.post('/users', async (req, res) => {
    const user = req.body;
    // insert email if user doesnt exists: 
    // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: 'user already exists', insertedId: null })
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  });

  // payment Gateways Intent 
  app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100)
    console.log(amount , 'this is amount')
  
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ['card']
    });
  
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  });
  
  // payment related api
  app.get('/payments/:email', verifyToken, async (req, res) => {
    const query = { email: req.params.email }
    if (req.params.email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    const result = await paymentCollection.find(query).toArray();
    res.send(result);
  })

  app.post('/payments', async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);

    //  carefully delete each item from the cart
    console.log('payment info', payment);
    const query = {
      _id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }
    };

    const deleteResult = await cartCollection.deleteMany(query);

    res.send({ paymentResult, deleteResult });
  })

  // stats
  app.get('/admin-stats',verifyToken,verifyAdmin, async(req , res)=>{
    const users = await userCollection.estimatedDocumentCount();
    const menuItems = await menuCollection.estimatedDocumentCount();
    const orders = await paymentCollection.estimatedDocumentCount();

    // bangla system this is not the best way
    // const payments = await paymentCollection.find().toArray();
    // const revenue = payments.reduce((total,payment) => total+ payment.price ,0)
    const result = await paymentCollection.aggregate([
      {
        $group:{
          _id: null,
          totalRevenue:{
            $sum: '$price'
          }
        }
      }
    ]).toArray()
    const revenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.send({
      users,
      menuItems,
      orders,
      revenue
    })
  })
  


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);



app.get('/',(res,req)=>{
    req.send('bistro boss server is runig')
})

app.listen(port, ()=>{
    console.log(`bistro bos server runig and stiing on port ${port}`)
})





