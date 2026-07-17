FROM ollama/ollama

RUN apt-get update && apt remove curl &&apt-get install -y curl
RUN apt-get install -y dos2unix

WORKDIR /app
COPY . .
RUN dos2unix /app/entrypoint.sh && chmod +x ./entrypoint.sh
EXPOSE 11434

ENTRYPOINT [ "./entrypoint.sh" ]