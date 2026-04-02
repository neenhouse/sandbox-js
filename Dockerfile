FROM denoland/deno:2.0.0

WORKDIR /app
COPY . .

RUN deno cache src/main.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-run", "--allow-env", "--allow-write", "src/main.ts"]
