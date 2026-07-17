FROM minio/minio:latest

# MinIO server container for local S3-compatible storage
# Credentials are set from the environment below. You can override them
# at runtime with --env or --env-file when using docker run.

ENV MINIO_ROOT_USER=hackract_admin
ENV MINIO_ROOT_PASSWORD=hackract_secret_123

EXPOSE 9000 9001

VOLUME ["/data"]

CMD ["server", "/data", "--console-address", ":9001"]