# ExamenPPSmayo

VIDEO EXPLICACION: https://drive.google.com/file/d/16kxV8DV283X_fhZ0sXYvpyWhXc3SNTq2/view?usp=sharing

Archivos a subir al servidor HTML en carpeta "html a montar en webserver".. acceso desde https://127.0.0.1/

Para instalar:
npm install

Para Iniciar:
npm start



# Servidor Node.js - Express

- Cada usuari tindrà solament accés a les seues anotacions i podrà insertar de noves o eliminar les que ja tenia insertades.
 L’usuari admin tindrà accés a totes les anotacions de tots els usuaris i podrà elimin
- Utilitza una base de dades SQLite que guarde tota la informació, tant d’usuari com d’anotacions.
- Relaciona les taules d’usuari i anotacions. 
- Protegix els endpoints contra injecció d’SQL.
- Guarda la informació de forma segura (tant la contrasenya com les anotacions).
- El control de sessió es durà a terme utilitzant un token, que es comprovarà en cada accés a qualsevol endpoint, a més, es faran les comprovacions necessàries per a que cada usuari sols accedisca a la informació a la qual està autoritzat.
- API 
 - API per a creació d’usuari.
 - API de creació d’anotació.
 - API de consulta d’anotacions donat el id d’un usuari.
 - API d’eliminació d’anotació donat el seu id. 

# Client – HTML - Javascript

- Formulari per a donar d’alta un usuari. Les dades que necessitem de l’usuari són el seu nom d’usuari, el seu correu electrònic i la contrasenya d’accés. 
- Protegeix les comunicacions entre client i servidor, guarda la informació de forma segura.
- Oculta tot el que pugues el codi a la part del client.
- Fes que el formulari no s’envie si no estan tots els camps complets i la contrasenya té almenys 8 caràcters.

# Posada en producció

- Desenvolupa un xicotet manual de com posar en funcionament l’aplicació.
