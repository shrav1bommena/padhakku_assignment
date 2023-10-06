const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "database.db");

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// todo
// jwtoken for unauthorization -- if needed

//  API 1 user register
app.post("/api/signup", async (request, response) => {
  const { name, email } = request.body;
  let regex = new RegExp("[a-z0-9]+@[a-z]+.[a-z]{2,3}");

  if (regex.test(email)) {
    const selectUserQuery = `
  SELECT * FROM users 
  WHERE email = '${email}';
  `;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `INSERT INTO users (name, email) 
        VALUES (
            '${name}',
            '${email}'
        );
        `;
      await database.run(createUserQuery);
      response.send({
        status: 200,
        message: "Successful user sign-up.",
      });
    } else {
      response.status(400);
      response.send({
        status: 400,
        message: "Email already registered.",
      });
    }
  } else {
    response.status(400);
    response.send({
      status: 400,
      message: "Invalid email format.",
    });
  }
});

//  API 2 Create Post API
app.post("/api/posts", async (request, response) => {
  const { userId, content } = request.body;
  if (content.length !== 0) {
    const selectUserQuery = `
            SELECT * FROM users 
            WHERE userID = '${userId}';
            `;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser !== undefined) {
      const createPostQuery = `
            INSERT INTO posts (content, userID)
            VALUES (
                '${content}',
                ${userId}
            );
            `;
      await database.run(createPostQuery);
      response.send({
        status: 200,
        message: "Successfully created.",
      });
    } else {
      response.status(404);
      response.send({
        status: 404,
        message: "User ID not found.",
      });
    }
  } else {
    response.status(400);
    response.send({
      status: 400,
      message: "Content cannot be empty.",
    });
  }
});

//todo middleware function
// using below code to check authorized user
//  let userID;
//  console.log(request.headers);
//  const { authHeader } = request.headers["authorization"];

//  if (authHeader !== undefined) {
//    userID = authHeader.split(" ")[1];
//  }
//  if (userID === undefined) {
//    response.status(403);
//    response.send({
//      status: 403,
//      message: "Unauthorized to delete this post.",
//    });
//  }

// API 3 Delete Post API

app.delete("/api/deletepost/:postId", async (request, response) => {
  const { postId } = request.params;

  const checkPostIdQuery = `
    SELECT * FROM posts
    WHERE postID = ${postId};
  `;

  const checkPostId = await database.get(checkPostIdQuery);
  if (checkPostId !== undefined) {
    const deletePostQuery = `
    DELETE FROM posts
    WHERE postID = ${postId};
    `;
    await database.run(deletePostQuery);
    response.send({
      status: 200,
      message: "Successful post deletion.",
    });
  } else {
    response.status(404);
    response.send({
      status: 404,
      message: "Post ID not found.",
    });
  }
});

//  API 4 Get user posts
app.get("/api/posts/:userId", async (request, response) => {
  const { userId } = request.params;
  const selectUserQuery = `
            SELECT * FROM users 
            WHERE userID = '${userId}';
            `;
  const dbUser = await database.get(selectUserQuery);

  if (dbUser !== undefined) {
    const fetchPostsQuery = `
            SELECT postID, content FROM posts
            WHERE userID = ${userId};
        `;
    const posts = await database.all(fetchPostsQuery);

    if (posts.length === 0) {
      response.status(404);
      response.send({
        status: 404,
        message: "No posts found for this user.",
      });
    } else {
      response.send({ status: 200, posts: [...posts] });
    }
  } else {
    response.status(404);
    response.send({
      status: 404,
      message: "User ID not found.",
    });
  }
});
