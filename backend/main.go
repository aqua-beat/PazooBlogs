package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// User モデル (ユーザー情報)
type User struct {
	gorm.Model
	Username string `json:"username" gorm:"unique"` // 重複禁止
	Password string `json:"password"`
}

// Like モデル
type Like struct {
	ID        uint `gorm:"primarykey"`
	UserID    uint
	PostID    uint
	CreatedAt time.Time
}

// Post モデル
type Post struct {
	gorm.Model
	ImageURL  string `json:"image_url"`
	Caption   string `json:"caption"`
	UserID    uint   `json:"user_id"`
	Username  string `json:"username"`
	LikeCount int64  `json:"like_count" gorm:"-"`
	IsLiked   bool   `json:"is_liked" gorm:"-"`
}

// JWTの署名に使う鍵
var jwtSecret = []byte("your_secret_key_pazooblogs")

func main() {
	// DB接続
	dsn := "root:@tcp(127.0.0.1:3306)/pazooblogs_db?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("データベースへの接続に失敗しました")
	}

	// マイグレーション
	db.AutoMigrate(&User{}, &Post{}, &Like{})

	r := gin.Default()

	// CORS設定
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 画像ディレクトリ設定
	if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		os.Mkdir("./uploads", 0755)
	}
	r.Static("/uploads", "./uploads")

	// ユーザーID取得ヘルパー
	getUserID := func(c *gin.Context) uint {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			return 0
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if token != nil && token.Valid {
			claims, _ := token.Claims.(jwt.MapClaims)
			return uint(claims["sub"].(float64))
		}
		return 0
	}

	// --- API ルーティング ---

	// ユーザー登録 API
	r.POST("/api/signup", func(c *gin.Context) {
		var user User
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "データ形式が正しくありません"})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "サーバーエラー"})
			return
		}
		user.Password = string(hashedPassword)

		if result := db.Create(&user); result.Error != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザー名が既に使用されています"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "ユーザー登録が完了しました"})
	})

	// ログイン
	r.POST("/api/login", func(c *gin.Context) {
		var input User // ユーザーからの入力 (username, password)
		var user User  // DBから取得するユーザー情報

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "データ形式が正しくありません"})
			return
		}

		// ユーザー名でDB検索
		if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー名またはパスワードが間違っています"})
			return
		}

		// パスワード照合
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザー名またはパスワードが間違っています"})
			return
		}

		// JWTトークンの生成
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":      user.ID,                               // ユーザーID
			"username": user.Username,                         // ユーザー名
			"exp":      time.Now().Add(time.Hour * 24).Unix(), // 有効期限: 24時間
		})

		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "トークン生成エラー"})
			return
		}

		// トークンを返す
		c.JSON(http.StatusOK, gin.H{
			"token":    tokenString,
			"username": user.Username,
			"user_id":  user.ID,
		})
	})

	// 投稿一覧 API
	r.GET("/api/posts", func(c *gin.Context) {
		userID := getUserID(c)
		var posts []Post
		db.Order("created_at desc").Find(&posts)

		for i := range posts {
			var count int64
			db.Model(&Like{}).Where("post_id = ?", posts[i].ID).Count(&count)
			posts[i].LikeCount = count
			if userID > 0 {
				var like Like
				if err := db.Where("user_id = ? AND post_id = ?", userID, posts[i].ID).First(&like).Error; err == nil {
					posts[i].IsLiked = true
				}
			}
		}
		c.JSON(http.StatusOK, posts)
	})

	// 新規投稿 API
	r.POST("/api/posts", func(c *gin.Context) {
		userID := getUserID(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}

		// ユーザー名取得
		authHeader := c.GetHeader("Authorization")
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) { return jwtSecret, nil })
		claims, _ := token.Claims.(jwt.MapClaims)
		username := claims["username"].(string)

		// 画像とキャプションの取得
		caption := c.PostForm("caption")
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "画像が必要です"})
			return
		}

		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savePath := filepath.Join("./uploads", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失敗"})
			return
		}

		// DBに保存 (ユーザー情報付き)
		post := Post{
			ImageURL: "/uploads/" + filename,
			Caption:  caption,
			UserID:   userID,
			Username: username,
		}
		db.Create(&post)
		c.JSON(http.StatusOK, post)
	})

	// 自分の投稿一覧取得API
	r.GET("/api/me/posts", func(c *gin.Context) {
		userID := getUserID(c)
		// トークン検証
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}

		var posts []Post
		db.Where("user_id = ?", userID).Order("created_at desc").Find(&posts)

		for i := range posts {
			var count int64
			db.Model(&Like{}).Where("post_id = ?", posts[i].ID).Count(&count)
			posts[i].LikeCount = count
			var like Like
			if err := db.Where("user_id = ? AND post_id = ?", userID, posts[i].ID).First(&like).Error; err == nil {
				posts[i].IsLiked = true
			}
		}
		c.JSON(http.StatusOK, posts)
	})

	// 投稿削除
	r.DELETE("/api/posts/:id", func(c *gin.Context) {
		userID := getUserID(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}
		postID := c.Param("id")

		var post Post
		if err := db.Where("id = ? AND user_id = ?", postID, userID).First(&post).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "権限がありません"})
			return
		}
		// 画像ファイル削除
		if len(post.ImageURL) > 0 {
			filePath := "." + post.ImageURL
			os.Remove(filePath)
		}
		db.Delete(&post)
		c.JSON(http.StatusOK, gin.H{"message": "削除しました"})
	})

	// いいね切り替え (Toggle)
	r.POST("/api/posts/:id/like", func(c *gin.Context) {
		userID := getUserID(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}
		postID := c.Param("id")

		var like Like
		if err := db.Where("user_id = ? AND post_id = ?", userID, postID).First(&like).Error; err == nil {
			// 既にしているので解除
			db.Delete(&like)
			c.JSON(http.StatusOK, gin.H{"liked": false})
		} else {
			// 新規作成
			var pID uint
			fmt.Sscanf(postID, "%d", &pID)
			db.Create(&Like{UserID: userID, PostID: pID})
			c.JSON(http.StatusOK, gin.H{"liked": true})
		}
	})

	r.Run(":8080")
}
