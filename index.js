const express = require('express');
const app = express()
const cors = require('cors');
require('dotenv').config()
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

    app.get('/menu', async(req,res) =>{
        const result = await menuCollection.find().toArray()
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
    

    app.delete('/users/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await userCollection.deleteOne(query)
      res.send(result) 
    })
    app.patch('/users/admin/:id',async(req,res)=>{
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

    


    app.get('/users', async(req,res) =>{
      const result = await userCollection.find().toArray()
      res.send(result)
  })
    app.post('/users' , async(req,res)=>{
      const user = req.body;

      const query = {email: user.email}
      const existingUser = await userCollection.find(query)
      if(existingUser){
        return res.send({message: 'user already exisit', insertedId: null})
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
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





