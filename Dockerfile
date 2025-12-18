FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Set timezone to Japan
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Install Playwright browsers
RUN npx playwright install --with-deps

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p testcases reports

# Set permissions
RUN chmod +x scripts/*.sh 2>/dev/null || true

EXPOSE 9323

CMD ["npm", "test"]