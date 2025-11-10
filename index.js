const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const port = process.env.PORT || 3000;
require('dotenv').config()
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6t2ckxo.mongodb.net/?appName=Cluster0`;

app.get('/', (req, res) => {
  res.send('server is  running')
})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    await client.connect();

    const db = client.db('healthDBtraker')
    const healthCollection = db.collection('health')
    const habitCollection = db.collection('habit')

    //all habit releted api here
    app.get('/habit', async (req, res) => {
      const result = await habitCollection.find().toArray()
      res.send(result)
    })

    app.get('/habit/:id', async (req, res) => {
      const { id } = req.params
      const query = { _id: new ObjectId (id) }
      const result = await habitCollection.findOne(query)
      res.send(result)
    })
    app.put('/habit/:id',async(req,res)=>{
      const {id}=req.params
      const data=req.body
     
      const query={ _id: new  ObjectId(id)}
      const filter=query
      const update={
        $set:data
      }
      const result= await habitCollection.updateOne(filter,update)

      res.send(result)
    })
    app.delete('/habit/:id',async(req,res)=>{
      const {id}=req.params
      const query={_id: new ObjectId(id)}
      const result=await habitCollection.deleteOne(query)
      res.send(result)
    })
    app.post('/habit', async (req, res) => {
      const data = req.body

      const result = await habitCollection.insertOne(data)
      res.send(result)
    })

    // my habit api
    app.get('/my-habit', async (req, res) => {
      const email = req.query.email
      
      const result = await habitCollection.find({
       
creatorEmail: email
      }).toArray()
      res.send(result)
    })

    // health related api
    app.get('/health', async (req, res) => {
      const result = await healthCollection.find().toArray()
      res.send(result)
    })

    app.get('/latest-health', async (req, res) => {
      const result = await healthCollection.find().sort({ createdAt: 'desc' }).limit(6).toArray()
      res.send(result)
    })
    app.get('/health/:id', async (req, res) => {
      const { id } = req.params
      const query = { _id: id }
      const result = await healthCollection.findOne(query)
      res.send(result)

    })




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server is running Now ${port}`)
})