CREATE TABLE IF NOT EXISTS `People` (
  `id` INTEGER NOT NULL auto_increment , 
  `name` VARCHAR(255) NOT NULL, 
  `present` TINYINT(1) DEFAULT 0, 
  `createdAt` DATETIME NOT NULL, 
  `updatedAt` DATETIME NOT NULL, 
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

node -e "console.log(require('bcryptjs').hashSync('TuNuevaContraseña', 10))"