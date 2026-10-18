@echo off
docker exec -i -w /var/www/minhas_financas/backend php-fpm php /var/www/minhas_financas/tools/composer.phar %*