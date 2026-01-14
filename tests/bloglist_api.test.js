const bcrypt = require('bcrypt')
const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const helper = require('./test_helper')
const Blog = require('../models/blog')
const User = require('../models/user')
const mongoose = require('mongoose')

describe('when there is initially some blogs in the db', () => {
  let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImVuZ25oc2hsIiwiaWQiOiI2OTY3ZjUyZWMwZThkYzFhNTkyMWNhZWMiLCJpYXQiOjE3Njg0MjE2Nzd9.xWVyGPR8wZ4omC4-UhxuZBZdvHW7XyURFYd0UskNvBw'

  beforeEach(async () => {
    await User.deleteMany({})
    const passwordHash = await bcrypt.hash('password', 10)
    const user = new User({ username: 'root', name: 'root', passwordHash })
    await user.save()

    const result = await api.post('/api/login').send({ username: 'root', password: 'password' })
    token = result.body.token

    await Blog.deleteMany({})
    // Add the user ID to the initial blogs
    const blogsWithUser = helper.initialBlogs.map(blog => ({ ...blog, user: user._id }))
    await Blog.insertMany(blogsWithUser)
  })

  describe('viweing blogs', () => {
    test('all blogs return as json', async () => {
      const res = await api.get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/)
      assert.strictEqual(res.body.length, helper.initialBlogs.length)
    })

    test('blogs have a unique identifier named id', async () => {
      const res = await api.get('/api/blogs')

      res.body.forEach(blog => {
        assert.ok(blog.id)
        assert.strictEqual(blog._id, undefined)
      })
    })

    test('blogs can be viewed without a token', async () => {
      await api
        .get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/)
    })
  })

  describe('addition of a new blog', () => {
    test('a valid blog can be added', async () => {
      const newBlog = {
        title: 'React tests',
        author: 'EngNhshl',
        url: 'http://localhost.com',
        likes: 10
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

      const titles = blogsAtEnd.map(b => b.title)
      assert(titles.includes('React tests'))
    })

    test('if likes property is missing, it defaults to 0', async () => {
      const newBlog = { title: 'Test', author: 'Me', url: 'http://test.com' }
      const response = await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(201)
      assert.strictEqual(response.body.likes, 0)
    })

    test('blog without title is not added', async () => {
      const newBlog = {
        author: 'EngNhshl',
        url: 'http://test.com'
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)
    })

    test('blog without url is not added', async () => {
      const newBlog = {
        title: 'Missing URL blog',
        author: 'EngNhshl'
      }

      await api
        .post('/api/blogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('fails with 401 Unauthorized if token is missing', async () => {
      const newBlog = { title: 'No Token', author: 'Me', url: 'http://test.com' }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(401)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })


  describe('deletion of a blog', () => {
    test('succeeds with status code 204 if id is valid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      const ids = blogsAtEnd.map(r => r.id)
      assert(!ids.includes(blogToDelete.id))
      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)
    })

    test('a blog can be deleted by its creator', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
    })

    test('deletion fails with 401 if a different user tries to delete', async () => {
      const secondUser = new User({ username: 'thief', passwordHash: '...' })
      await secondUser.save()

      const loginRes = await api.post('/api/login').send({ username: 'thief', password: 'password' })
      const wrongToken = loginRes.body.token

      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(401)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })
  })

  describe('updating of a blog', () => {
    test('updates the number of likes for a blog', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]

      const updatedLikes = { likes: blogToUpdate.likes + 1 }

      const res = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedLikes)
        .expect(200)

      assert.strictEqual(res.body.likes, blogToUpdate.likes + 1)
    })
  })

})

after(async () => {
  await mongoose.connection.close()
})