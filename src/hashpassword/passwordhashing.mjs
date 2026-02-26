import bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashing = (password) => {
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(password, salt);
};

export const comparepassword = (plain, hash) => {
  return bcrypt.compareSync(plain, hash); 
};
