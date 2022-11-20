- \$ docker-compose up -d
- \$ docker-compose stop
- visit http://127.0.0.1:9000/wp-admin/

Check for errors:

\$ docker-compose logs -f

Restart with cleanup:

docker-compose stop;docker-compose rm -f;docker-compose up -d

## Enable import debug

Edit in docker file /var/www/html/wp-content/plugins/wordpress-importer/wordpress-importer.php and change define( 'IMPORT_DEBUG', false); to define( 'IMPORT_DEBUG', true);

## Import Troubleshooting

https://blog.plip.com/2015/01/03/importing-and-trouble-shooting-wordpress-imports/
