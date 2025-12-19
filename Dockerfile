FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Install and configure UTF-8 locale
RUN apt-get update && apt-get install -y locales && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set environment variables for UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV TZ=Asia/Tokyo
ENV LESSCHARSET=utf-8

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