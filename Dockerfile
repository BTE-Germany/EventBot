FROM denoland/deno:1.10.3

WORKDIR /app

# Prefer not to run as root.
USER deno

COPY deps.ts .
RUN deno cache deps.ts


ADD . .
RUN deno cache mod.ts

CMD ["run", "-A", "--allow-net", "mod.ts"]