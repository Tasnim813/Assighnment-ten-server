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
const streakCollection = db.collection("streaks");

// -------------------- Get Habit --------------------
app.get("/habit/:id", async (req, res) => {
  const { id } = req.params;
  const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
  if (!habit) return res.status(404).send({ error: "Habit not found" });

  // Fetch streak from streaks collection
  const streakDoc = await streakCollection.findOne({ habitId: id });
  habit.streak = streakDoc ? streakDoc.streak : 0;
  habit.completionHistory = streakDoc ? streakDoc.completionHistory : [];

  res.send(habit);
});

// -------------------- Mark Complete --------------------
app.put("/habit/:id/complete", async (req, res) => {
  const { id } = req.params;

  const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
  if (!habit) return res.status(404).send({ error: "Habit not found" });

  const today = new Date().toDateString();

  let streakDoc = await streakCollection.findOne({ habitId: id });
  const currentHistory = streakDoc?.completionHistory || [];

  // Prevent duplicate for today
  if (currentHistory.some(d => new Date(d).toDateString() === today)) {
    return res.status(400).send({ error: "Already completed today" });
  }

  // Update history
  const updatedHistory = [...currentHistory, new Date()];

  // Calculate streak
  const sortedDates = updatedHistory.map(d => new Date(d)).sort((a, b) => b - a);
  let count = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const diff = (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) count++;
    else break;
  }

  // Upsert streak document
  await streakCollection.updateOne(
    { habitId: id },
    { $set: { habitId: id, streak: count, completionHistory: updatedHistory, updatedAt: new Date() } },
    { upsert: true }
  );

  res.send({ success: true, completionHistory: updatedHistory, streak: count });
});


    // final api dont touvh here
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