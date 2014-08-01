require 'rubygems'
require 'sinatra'
require 'multi_json'
require 'data_mapper'
require 'haml'

DataMapper.setup(:default, ENV['DATABASE_URL'] || "sqlite3://#{Dir.pwd}/resistance.db")

class Soldier
  include DataMapper::Resource
  
  property :id,         Serial
  property :name,       String, :required => true
  property :email,      String, :required => true, :unique => true
  property :password,   String, :required => true
  property :rank,       String, :required => true
  
  has n, :posts
  has n, :comments
  has n, :bookmarks
end

class Post
  include DataMapper::Resource
  
  property :id,           Serial
  property :text,         String, length: 1..200
  property :created_on,   DateTime
  property :approved,     Integer, :default => 0
  property :disapproved,  Integer, :default => 0
  
  belongs_to :soldier
  
  has n, :comments
  has n, :bookmarks, :through => Resource
end

class Comment
  include DataMapper::Resource
  
  property :id,         Serial
  property :text,       String, length: 1..200
  property :created_on, DateTime
  
  belongs_to :post
  belongs_to :soldier
end

class Bookmark
  include DataMapper::Resource
  
  property :id,         Serial
  
  belongs_to :soldier
  
  has n, :posts, :through => Resource
end

class BookmarkPost
  include DataMapper::Resource
  
  belongs_to :bookmark,   :key => true
  belongs_to :post,       :key => true
end

Soldier.finalize
Soldier.auto_upgrade!

Post.finalize
Post.auto_upgrade!

Comment.finalize
Comment.auto_upgrade!

Bookmark.finalize
Bookmark.auto_upgrade!

BookmarkPost.finalize
BookmarkPost.auto_upgrade!

enable :sessions

post '/posts.json' do
  content_type :json
  
  request.body.rewind
  request_payload = MultiJson.load request.body.read, :symbolize_keys => true

  bookmark = request_payload[:bookmark]
  last_post_id = request_payload[:last_post_id] == nil ? nil : request_payload[:last_post_id]
  
  if bookmark == nil
    if last_post_id != nil
      posts = Post.all(:limit => 10, :order => [ :created_on.desc ], :id.lt => last_post_id)
    else
      posts = Post.all(:limit => 10, :order => [ :created_on.desc ])
    end
  else
    if session[:soldier_id] == nil
      return MultiJson.dump(status: 'not_logged_in')
    else
      if last_post_id != nil
        posts = Soldier.get(session[:soldier_id]).bookmarks.posts(:limit => 10, :order => [ :created_on.desc ], :id.lt => last_post_id)
      else
        posts = Soldier.get(session[:soldier_id]).bookmarks.posts(:limit => 10, :order => [ :created_on.desc ])
      end
    end
  end
  
  hierarchical_posts = []
  posts.each do |post|
    comments = []
    post.comments.each do |comment|
      comments << {
        :id => comment.id, 
        :text => comment.text, 
        :created_on => comment.created_on,
        :soldier_id => comment.soldier.id,
        :soldier_name => comment.soldier.name
      }
    end
    
    hierarchical_posts << {
      :id => post.id, 
      :text => post.text, 
      :created_on => post.created_on,
      :soldier_id => post.soldier.id, 
      :soldier_name => post.soldier.name, 
      :rank => post.soldier.rank,
      :approved => post.approved,
      :disapproved => post.disapproved,
      :comments => comments,
      :hide_comments => false,
      :saved => session[:soldier_id] != nil && Soldier.get(session[:soldier_id]).bookmarks.posts.include?(post) ? true : false
    }
  end
  MultiJson.dump(posts: hierarchical_posts)
end

post '/posts/:id/approve.json' do
  content_type :json
  
  post = Post.get(params[:id])

  post.approved += 1
  post.save
  
  MultiJson.dump(count: post.approved)
end

post '/posts/:id/disapprove.json' do
  content_type :json
  
  post = Post.get(params[:id])
  post.disapproved += 1
  post.save
  
  MultiJson.dump(count: post.disapproved)
end

post '/login.json' do
  content_type :json
  
  if(session[:soldier_id] != nil)
    return MultiJson.dump(status: 'logged_in')
  end
  
  request.body.rewind
  request_payload = MultiJson.load request.body.read, :symbolize_keys => true

  #do something with request_payload
  email = request_payload[:email]
  password = request_payload[:password]
  
  soldier = Soldier.first(:email => email, :password =>password)
  if soldier != nil
    session[:soldier_id] = soldier.id
    MultiJson.dump(status: 'success')
  else
    MultiJson.dump(status: 'Invalid email/password')
  end
end

post '/logout.json' do
  content_type :json
  
  if(session[:soldier_id] == nil)
    return MultiJson.dump(status: 'already logged out')
  end
  
  session[:soldier_id] = nil
  MultiJson.dump(status: 'success')
end

get '/get_loggedin_soldier.json' do
  content_type :json
  
  if session[:soldier_id] != nil
    soldier = Soldier.get(session[:soldier_id])
  else
    soldier = nil
  end
  
  if soldier != nil
    MultiJson.dump(soldier: {
      id: soldier.id,
      name: soldier.name
      });
  else
    MultiJson.dump(soldier: {})
  end
end

post '/signup.json' do
  content_type :json
  
  if(session[:soldier_id] != nil)
    return MultiJson.dump(status: 'logged_in')
  end
  
  request.body.rewind
  request_payload = MultiJson.load request.body.read, :symbolize_keys => true

  name = request_payload[:name]
  email = request_payload[:email]
  password = request_payload[:password]
  rank = request_payload[:rank]
  
  soldier = Soldier.new
  soldier.name = name
  soldier.email = email
  soldier.password = password
  soldier.rank = rank
  
  soldier.save

  if soldier.saved?
    MultiJson.dump(status: 'success')
  else
    MultiJson.dump(status: soldier.errors.first)
  end
end

post '/posts/create.json' do
  content_type :json
  
  if(session[:soldier_id] == nil)
    return MultiJson.dump(status: 'Not logged in')
  end
  
  request.body.rewind
  request_payload = MultiJson.load request.body.read, :symbolize_keys => true
  
  message = request_payload[:message]
  
  post = Post.create(
    :text => message,
    :created_on => Time.now,
    :soldier_id => session[:soldier_id]
  );
  
  if post.saved?
    MultiJson.dump(status: 'success')
  else
    MultiJson.dump(status: "Couldn't broadcast message")
  end
end

post '/posts/:post_id/bookmark.json' do
  content_type :json
  
  if(session[:soldier_id] == nil)
    return MultiJson.dump(status: 'Not logged in')
  end
  
  bookmark = Bookmark.new
  bookmark.soldier = Soldier.get(session[:soldier_id])
  bookmark.posts << Post.get(params[:post_id])
  bookmark.save
  
  if bookmark.saved?
    MultiJson.dump(status: 'success')
  else
    MultiJson.dump(status: "Couldn't save message")
  end
end

post '/posts/:post_id/create_comment.json' do
  content_type :json
  
  if(session[:soldier_id] == nil)
    return MultiJson.dump(status: 'Not logged in')
  end
  
  request.body.rewind
  request_payload = MultiJson.load request.body.read, :symbolize_keys => true
  
  message = request_payload[:message]
  
  comment = Comment.create(
    :text => message,
    :created_on => Time.now,
    :post_id => params[:post_id],
    :soldier_id => session[:soldier_id]
  );
  
  if comment.saved?
    MultiJson.dump(status: 'success', id: comment.id)
  else
    MultiJson.dump(status: "Couldn't post comment")
  end
end

get '/' do
  File.read(File.join('public', 'index.html'))
end