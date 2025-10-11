export class User{
    
    id: number;
    email: string;
    name: string;
    lastName:string;
    role: string;
    password:string;
    image: string;

    constructor(user: User){
        this.id = user.id;
        this.name = user.name;
        this.lastName = user.lastName;
        this.role = user.role;
        this.password = user.password;
        this.email = user.email;
        this.image = user.image;
    }

}