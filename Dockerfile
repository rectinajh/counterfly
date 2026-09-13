FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages "numpy==1.26.4"

WORKDIR /app

# Install npm dependencies before copying the full source so this layer is cached.
COPY package.json package-lock.json ./
COPY contracts/package.json contracts/package.json
COPY worker/package.json worker/package.json
COPY dashboard/package.json dashboard/package.json

RUN npm ci

COPY . .

ENV PORT=8787
ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "run", "serve", "-w", "@counterfly/worker"]
