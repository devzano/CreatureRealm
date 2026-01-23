// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import universeRequestRouter from "./routes/creaturerealmUniverseRequest.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("You might not be in the right place");
});

app.use("/feedback", universeRequestRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
