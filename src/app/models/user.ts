export class User{
    
    id: number;
    email: string;
    firstName: string;
    lastName:string;
    role: string;
    password:string;
    image: string;

    constructor(user: User){
        this.id = user.id;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.role = user.role;
        this.password = user.password;
        this.email = user.email;
        this.image = user.image;
    }

}