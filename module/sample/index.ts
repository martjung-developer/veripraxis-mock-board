

import Swal from 'sweetalert2';

export default function Sample(name: string) {

    return Swal.fire({
        title: 'Hello!',
        text: name,
        icon: 'success',
        confirmButtonText: 'OK'
    });

}

