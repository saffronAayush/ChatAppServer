import { User } from "../models/user.model.js";
import { faker } from "@faker-js/faker";

export const createUser = async (num) => {
  try {
    const usersPromise = [];

    for (let i = 0; i < 10; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.username(),
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      usersPromise.push(tempUser);
    }
    await Promise.all(usersPromise);
    console.log("user created", num);
    process.exit(1);
  } catch (error) {
    console.log(error);
    process.exit(0);
  }
};

// const createSampleChats = (chatCount)=>{

// }
