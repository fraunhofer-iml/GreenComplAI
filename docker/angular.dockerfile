FROM docker.io/nginxinc/nginx-unprivileged

ARG APP

USER root
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY ./dist/apps/${APP} /usr/share/nginx/html/

USER nginx
EXPOSE 8080:8080
CMD ["/bin/sh",  "-c",  "exec nginx -g 'daemon off;'"]

