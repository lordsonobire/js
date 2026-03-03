package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"match-me-server/internal/database"
	"match-me-server/internal/realtime"
	"match-me-server/internal/routes"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load .env
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system env")
	}

	// Init DB
	database.InitDB()

	// Router
	r := mux.NewRouter()

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Match-Me Go API Running"))
	})

	// Init Hub
	hub := realtime.NewHub()
	go hub.Run()

	// Setup App Routes
	routes.SetupRoutes(r, hub)

	// Serve uploaded files
	os.MkdirAll("uploads", os.ModePerm)
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// CORS
	origins := []string{"http://localhost:3001", "http://localhost:5173"}
	if envOrigins := os.Getenv("CORS_ORIGINS"); envOrigins != "" {
		origins = strings.Split(envOrigins, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
	}
	c := cors.New(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000" // Default to 3000 to match old server
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
