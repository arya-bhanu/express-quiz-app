import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ScoreBoardModel from "../model/scoreboard.model.js";
import UserModel from "../model/user.model.js";
const role = "user";

export const registerUser = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;
  if (password != confirm_password)
    return res
      .status(400)
      .json({ message: "password and confirm password not equal" });
  const salt = await bcrypt.genSalt();
  const hashPassword = await bcrypt.hash(password, salt);
  try {
    await UserModel.create({
      username: username,
      password: hashPassword,
      email: email,
    });
    res.status(200).json({ message: "User successfully registered" });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
export const loginUser = async (req, res) => {
  const { email_username, password } = req.body;

  try {
    let user;
    if (isEmailOrUsername(email_username) === "email") {
      user = await UserModel.findOne({ where: { email: email_username } });
    } else {
      user = await UserModel.findOne({ where: { username: email_username } });
    }

    if (!user)
      return res.status(404).json({ message: "Username / password not found" });
    const match = bcrypt.compareSync(
      password,
      await user.getDataValue("password")
    );

    console.log(match);

    if (!match)
      return res
        .status(401)
        .json({ message: "Email/username or password is wrong" });
    const username = await user.getDataValue("username");
    const uid = await user.getDataValue("id");
    const email = await user.getDataValue("email");
    const accessToken = jwt.sign(
      { email, uid, username, role: "user" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", accessToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
export const logoutUser = async (req, res) => {
  res.clearCookie("token");
  return res.sendStatus(200);
};

export const getUserScoreboard = async (req, res) => {
  const { uid } = res.locals.data;
  try {
    const data = await ScoreBoardModel.findAll({
      where: { userId: uid },
      attributes: { exclude: ["userId", "updatedAt"] },
    });
    res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
export const postUserScoreboard = async (req, res) => {
  const { score, wrong_answer, not_answered, data_question_review } = req.body;
  const { uid } = res.locals.data;
  try {
    await ScoreBoardModel.create({
      score,
      wrong_answer,
      userId: uid,
      not_answered,
      data_question_review,
    });
    res
      .status(200)
      .json({ message: "score successfully added to user scoreboard" });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
export const getUserPostScore = async (req, res) => {
  const { id } = req.params;
  const { uid } = res.locals.data;
  try {
    const data = await ScoreBoardModel.findOne({
      where: { id },
      include: [{ model: UserModel, where: { id: uid } }],
      attributes: ["id", "data_question_review"],
    });
    if (data) return res.status(200).json(data);
    res.status(404).json({ message: "data not found" });
  } catch (err) {
    console.err(err);
    res.sendStatus(500);
  }
};

function isEmailOrUsername(input) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailPattern.test(input)) {
    return "email";
  } else {
    return "username";
  }
}
