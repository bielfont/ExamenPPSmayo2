function validateForm() {
  
    if (document.getElementById('name').value != '' &&
        document.getElementById('email').value != '' &&
        document.getElementById('password').value != '') {

        
            if (document.getElementById('password').value.length < 8) {
                alert('Tamaño inferior a 8 caracteres')
                return false
           }
           
           if (document.getElementById('password').value != document.getElementById('password2').value) {
                alert('No Coinciden')
                return false
            }

        
               
            

        return true
    }
    else {

        alert('Falta Rellenar')
        return false
    }


}