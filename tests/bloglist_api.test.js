const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const helper = require('./test_helper')
const Blog = require('../models/blog')
const { default: mongoose } = require('mongoose')

describe('when there is initially some blogs in the db', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
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
        .send(newBlog)
        .expect(201)

      console.log('Server response body:', response.body)

      assert.strictEqual(response.body.likes, 0)
    })

    test('blog without title is not added', async () => {
      const newBlog = {
        author: 'EngNhshl',
        url: 'http://test.com'
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)

      const blogsAtEnd = await helper.blogsInDb()
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
    })

    test('blog without url is not added', async () => {
      const newBlog = {
        title: 'Missing URL blog',
        author: 'EngNhshl'
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)

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
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()

      const ids = blogsAtEnd.map(r => r.id)
      assert(!ids.includes(blogToDelete.id))

      assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)
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