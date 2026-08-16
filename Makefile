.PHONY: new-post server build clean

# Create a new blog post stub
# Usage: make new-post slug=my-post-title
new-post:
	@if [ -z "$(slug)" ]; then \
		echo "Usage: make new-post slug=my-post-title"; \
		exit 1; \
	fi
	/usr/local/bin/hugo new posts/$$(date +%Y-%m-%d)-$(slug)/index.md

# Run dev server with drafts
server:
	/usr/local/bin/hugo server -D

# Production build (matches CI)
build:
	/usr/local/bin/hugo --gc --minify

# Clean public directory
clean:
	rm -rf public/
