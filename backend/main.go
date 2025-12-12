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

// Post モデル
type Post struct {
	gorm.Model
	ImageURL string `json:"image_url"`
	Caption  string `json:"caption"`
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
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

	// マイグレーション（UserテーブルとPostテーブルを作成）
	db.AutoMigrate(&User{}, &Post{})

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
		var posts []Post
		db.Order("created_at desc").Find(&posts)
		c.JSON(http.StatusOK, posts)
	})

	// 新規投稿 API
	r.POST("/api/posts", func(c *gin.Context) {
		// Authorizationヘッダーからトークンを取り出す
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// トークンを検証
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			return
		}

		claims, _ := token.Claims.(jwt.MapClaims)
		userID := uint(claims["sub"].(float64))
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
		authHeader := c.GetHeader("Authorization")
		// トークン検証
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ログインしてください"})
			return
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "無効なトークンです"})
			return
		}

		// ユーザーID取得
		claims, _ := token.Claims.(jwt.MapClaims)
		userID := uint(claims["sub"].(float64))

		// そのユーザーの投稿だけをDBから検索
		var posts []Post
		db.Where("user_id = ?", userID).Order("created_at desc").Find(&posts)

		c.JSON(http.StatusOK, posts)
	})

	r.Run(":8080")
}
