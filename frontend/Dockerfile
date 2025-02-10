FROM node:18-alpine AS build

WORKDIR /app/frontend

COPY package.json package-lock.json ./

RUN npm install express
RUN npm init -y

COPY . .

RUN npm run build


FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN apk update && apk add --no-cache npm

COPY --from=build /app/frontend/dist .

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
