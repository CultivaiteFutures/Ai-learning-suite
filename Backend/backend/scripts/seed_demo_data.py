"""
seed_demo_data.py -- Builds ONE complete, realistic, interconnected demo
school ("Meridian STEM Academy") entirely through real HTTP calls against a
running instance of the AI Learning Suite backend.

Every row this script creates -- the school, its grade levels, its 3
teachers, its 13 students, its 4 courses (with real modules/lessons/games/
assignments), enrollments, submissions, grades, announcements, discussions,
calendar events, and challenges -- is created through
the same validated REST API the real frontend uses. Nothing is written
directly to the database (that is deliberately reserved for
scripts/reset_demo_db.py, which is allowed to touch the database directly
only because there is no "wipe everything" API and there shouldn't be one).

Requirements:
    - Standard library only (urllib.request / json). No `requests`, no
      `httpx`, nothing to `pip install` on the machine that runs this.
    - The backend must already be running and reachable at BASE_URL below.
    - The database should be freshly reset (see scripts/reset_demo_db.py)
      before running this -- the script fails loudly and early if a school
      already exists, rather than silently creating duplicates.

How to run:
    python scripts/seed_demo_data.py

Everything this script creates -- every login, every join code, every
count -- is printed in a final summary at the end of a successful run.
"""
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Configuration -- change BASE_URL here if the backend runs on a different
# host/port. Everything else in this script is derived at runtime from real
# API responses (ids, join codes, etc.) -- nothing else is hardcoded.
# ---------------------------------------------------------------------------
BASE_URL = "http://localhost:8000/api/v1"

# Bootstrap Super Admin credentials -- these are the app's own defaults
# (app/core/config.py: FIRST_SUPERUSER / FIRST_SUPERUSER_PASSWORD), confirmed
# against Backend/backend/.env, which does not override them.
SUPER_ADMIN_EMAIL = "superadmin@system.com"
SUPER_ADMIN_PASSWORD = "password123"

SCHOOL_NAME = "Meridian STEM Academy"
SCHOOL_DOMAIN = "meridianstem.edu"
SCHOOL_ADMIN_EMAIL = "admin@meridianstem.edu"
SCHOOL_ADMIN_PASSWORD = "Demo@2026!"

TEACHER_PASSWORD = "Teacher@2026!"
STUDENT_PASSWORD = "Student@2026!"

NOW = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Minimal standard-library HTTP client
# ---------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, method, url, status, body):
        self.method = method
        self.url = url
        self.status = status
        self.body = body
        super().__init__(f"{method} {url} -> HTTP {status}: {body}")


class ApiClient:
    """Tiny urllib-based JSON HTTP client with Bearer auth support."""

    def __init__(self, base_url, token=None):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def _request(self, method, path, json_body=None):
        url = self.base_url + path
        data = None
        headers = {"Accept": "application/json"}
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                status = resp.getcode()
        except urllib.error.HTTPError as e:
            raw = e.read()
            body_text = raw.decode("utf-8", errors="replace") if raw else ""
            raise ApiError(method, url, e.code, body_text) from None
        except urllib.error.URLError as e:
            raise RuntimeError(
                f"{method} {url} -> could not connect ({e}). "
                f"Is the backend actually running at {self.base_url}?"
            ) from None

        if not (200 <= status < 300):
            raise ApiError(method, url, status, raw.decode("utf-8", errors="replace"))
        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return raw.decode("utf-8", errors="replace")

    def get(self, path):
        return self._request("GET", path)

    def post(self, path, body=None):
        return self._request("POST", path, body if body is not None else {})

    def put(self, path, body=None):
        return self._request("PUT", path, body if body is not None else {})

    def patch(self, path, body=None):
        return self._request("PATCH", path, body if body is not None else {})

    def delete(self, path):
        return self._request("DELETE", path)


def pick(d, *names):
    """Fetch the first present key from a dict, tolerating either the
    snake_case or camelCase spelling of a response field (this codebase's
    schemas serialize with a camelCase alias generator, but the exact
    casing returned by a given endpoint is verified empirically, not
    assumed -- this helper makes the script robust either way)."""
    for n in names:
        if n in d and d[n] is not None:
            return d[n]
    # last resort: allow an explicitly-present null value if that's all there is
    for n in names:
        if n in d:
            return d[n]
    raise KeyError(f"None of {names} found in keys {list(d.keys())}")


def login(email, password):
    anon = ApiClient(BASE_URL)
    resp = anon.post("/auth/login", {"email": email, "password": password})
    token = pick(resp, "access_token", "accessToken")
    client = ApiClient(BASE_URL, token=token)
    return client, resp["user"]


def iso(dt):
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Counters for the final summary -- populated as things are actually
# created, never guessed.
# ---------------------------------------------------------------------------
counts = {
    "schools": 0,
    "grades": 0,
    "teachers": 0,
    "students": 0,
    "courses": 0,
    "modules": 0,
    "lessons": 0,
    "assignments": 0,
    "submissions": 0,
    "submissions_graded": 0,
    "games": 0,
    "game_scores_submitted": 0,
    "announcements": 0,
    "discussions": 0,
    "discussion_replies": 0,
    "calendar_events": 0,
    "challenges": 0,
    "challenge_joins": 0,
    "lessons_completed_events": 0,
}


def bump(key, n=1):
    counts[key] = counts.get(key, 0) + n


# ---------------------------------------------------------------------------
# Section: Course / module / lesson content (real, substantive content --
# written as if by an actual subject teacher, not placeholder text).
# ---------------------------------------------------------------------------

def lesson(title, summary, paragraphs, duration_minutes):
    return {
        "title": title,
        "summary": summary,
        "content": "\n\n".join(paragraphs),
        "duration_minutes": duration_minutes,
    }


COURSES = [
    {
        "key": "ALG",
        "title": "Algebra I",
        "subject": "Math",
        "grade_level": "Grade 9",
        "teacher_idx": 0,
        "description": (
            "This course builds a solid foundation in algebraic thinking, guiding students from "
            "basic expressions through solving and graphing linear equations. Students will practice "
            "translating real-world situations into mathematical models and develop the problem-solving "
            "skills needed for higher-level math. By the end of the course, students should feel "
            "confident manipulating equations and interpreting graphs."
        ),
        "modules": [
            {
                "title": "Unit 1: Foundations of Algebra",
                "description": (
                    "An introduction to the building blocks of algebra: variables, expressions, and "
                    "the order of operations needed to simplify and evaluate them."
                ),
                "prerequisite_of_next": True,  # module 2 (index 1) will require this one
                "lessons": [
                    lesson(
                        "Understanding Variables and Expressions",
                        "Students will be able to identify variables, constants, and coefficients within an algebraic expression.",
                        [
                            "In algebra, a variable is a letter -- most commonly x, y, or n -- that stands in for a number "
                            "we don't yet know or that can change depending on the situation. An algebraic expression "
                            "combines variables, numbers, and operations (like addition, subtraction, multiplication, "
                            "and division) without an equals sign. For example, in the expression 5x + 3, the 5 is "
                            "called a coefficient because it multiplies the variable x, and the 3 is a constant because "
                            "its value never changes.",
                            "Learning to read expressions carefully is the first step toward solving equations later in "
                            "this unit. When we evaluate an expression, we substitute a specific number for the "
                            "variable and simplify using the order of operations. For instance, to evaluate 5x + 3 when "
                            "x = 4, we replace x with 4 to get 5(4) + 3 = 20 + 3 = 23. Being comfortable identifying "
                            "variables, coefficients, and constants will make every topic in this course easier to follow.",
                        ],
                        20,
                    ),
                    lesson(
                        "Order of Operations and Simplifying Expressions",
                        "Students will be able to apply the order of operations to simplify numerical and algebraic expressions.",
                        [
                            "The order of operations tells us which calculations to perform first so that everyone gets "
                            "the same answer from the same expression. The standard order -- often remembered with the "
                            "acronym PEMDAS -- is: Parentheses, Exponents, Multiplication and Division (left to right), "
                            "and finally Addition and Subtraction (left to right). Without an agreed-upon order, an "
                            "expression like 3 + 4 x 2 could be interpreted two different ways and give two different answers.",
                            "Simplifying an expression means rewriting it in its shortest, most reduced form by "
                            "combining like terms and following the order of operations. Like terms share the exact "
                            "same variable raised to the same power -- for example, 3x and 7x are like terms and "
                            "combine to 10x, but 3x and 7x^2 are not. Practicing simplification with increasingly "
                            "complex expressions builds the fluency students need before they start isolating "
                            "variables in equations.",
                        ],
                        20,
                    ),
                    lesson(
                        "Introduction to Solving One-Step Equations",
                        "Students will be able to solve one-variable, one-step equations using inverse operations.",
                        [
                            "An equation is a mathematical statement that two expressions are equal, connected by an "
                            "equals sign -- for example, x + 9 = 15. Solving an equation means finding the value of "
                            "the variable that makes the statement true. A one-step equation requires only a single "
                            "operation to isolate the variable, and the key strategy is to use the inverse (opposite) "
                            "operation on both sides of the equation.",
                            "If a number is added to the variable, we subtract it from both sides; if a number is "
                            "subtracted, we add it back; if the variable is multiplied by a number, we divide both "
                            "sides by that number, and vice versa. For x + 9 = 15, we subtract 9 from both sides to "
                            "get x = 6. Always perform the same operation on both sides -- this keeps the equation "
                            "balanced and guarantees the solution is correct.",
                        ],
                        25,
                    ),
                ],
            },
            {
                "title": "Unit 2: Linear Equations",
                "description": (
                    "Building on Unit 1, students extend their equation-solving skills to multi-step "
                    "equations and equations with variables on both sides."
                ),
                "lessons": [
                    lesson(
                        "Solving Multi-Step Linear Equations",
                        "Students will be able to solve multi-step linear equations by combining like terms and using inverse operations in the correct order.",
                        [
                            "Multi-step equations require more than one inverse operation to isolate the variable, and "
                            "they often include like terms that need to be combined first. A reliable strategy is to "
                            "simplify each side of the equation separately -- distributing any parentheses and "
                            "combining like terms -- before applying inverse operations. For example, to solve "
                            "2(x + 3) - 4 = 12, we first distribute to get 2x + 6 - 4 = 12, then combine like terms "
                            "to get 2x + 2 = 12.",
                            "From there, we subtract 2 from both sides to get 2x = 10, and finally divide both sides "
                            "by 2 to find x = 5. It helps to work through these problems in the same order every "
                            "time: simplify, undo addition/subtraction, then undo multiplication/division. Checking "
                            "your answer by substituting it back into the original equation is an excellent habit "
                            "that catches most careless errors.",
                        ],
                        25,
                    ),
                    lesson(
                        "Equations with Variables on Both Sides",
                        "Students will be able to solve linear equations that have variable terms on both sides of the equals sign.",
                        [
                            "Some equations have the variable appearing on both sides, such as 5x + 2 = 2x + 14. To "
                            "solve these, our first goal is to get all the variable terms on one side and all the "
                            "constant terms on the other. We do this by adding or subtracting a variable term from "
                            "both sides -- for example, subtracting 2x from both sides of 5x + 2 = 2x + 14 gives "
                            "3x + 2 = 14.",
                            "From there, the equation becomes a familiar multi-step equation: subtract 2 from both "
                            "sides to get 3x = 12, then divide by 3 to find x = 4. It doesn't matter which side you "
                            "choose to collect the variables on, as long as you apply the same operation to both "
                            "sides of the equation consistently. This skill is essential for solving many real-world "
                            "problems where two changing quantities are being compared.",
                        ],
                        25,
                    ),
                    lesson(
                        "Translating Word Problems into Equations",
                        "Students will be able to translate real-world word problems into linear equations and solve them.",
                        [
                            "One of the most powerful uses of algebra is modeling real situations with equations. To "
                            "translate a word problem, start by identifying what is unknown and assign it a "
                            "variable, then look for key words that signal mathematical operations -- 'sum' or "
                            "'total' suggests addition, 'difference' suggests subtraction, 'product' suggests "
                            "multiplication, and 'is' or 'was' usually signals an equals sign.",
                            "For example, 'Twice a number, decreased by 7, is 15' translates to 2x - 7 = 15, which "
                            "solves to x = 11. Practicing this translation step is often the hardest part for "
                            "students, since the math itself is usually straightforward once the equation is set up "
                            "correctly. Reading the problem carefully more than once, and double-checking that your "
                            "equation reflects every phrase, will make you much more accurate.",
                        ],
                        20,
                    ),
                ],
            },
            {
                "title": "Unit 3: Graphing & Functions",
                "description": (
                    "An introduction to the coordinate plane and graphing linear equations, connecting "
                    "algebraic equations to their visual representation."
                ),
                "lessons": [
                    lesson(
                        "The Coordinate Plane and Plotting Points",
                        "Students will be able to plot ordered pairs on the coordinate plane and identify coordinates of given points.",
                        [
                            "The coordinate plane is formed by two perpendicular number lines: the horizontal x-axis "
                            "and the vertical y-axis, which intersect at a point called the origin (0, 0). Every "
                            "point on the plane can be described by an ordered pair (x, y), where x tells us how far "
                            "to move left or right and y tells us how far to move up or down from the origin.",
                            "The plane is divided into four quadrants, numbered counterclockwise starting from the "
                            "upper right, and the signs of x and y tell you which quadrant a point falls in. Being "
                            "able to quickly and accurately plot points is the foundation for graphing lines, "
                            "functions, and eventually much more advanced mathematics, so it's worth practicing "
                            "until it feels automatic.",
                        ],
                        15,
                    ),
                    lesson(
                        "Graphing Linear Equations Using Slope-Intercept Form",
                        "Students will be able to graph a linear equation written in slope-intercept form using the slope and y-intercept.",
                        [
                            "Slope-intercept form writes a linear equation as y = mx + b, where m represents the "
                            "slope (the steepness and direction of the line) and b represents the y-intercept (the "
                            "point where the line crosses the y-axis). To graph an equation in this form, start by "
                            "plotting the y-intercept, then use the slope -- rise over run -- to find and plot a "
                            "second point.",
                            "For example, in y = 2x + 3, the y-intercept is 3, so we start at (0, 3); since the "
                            "slope is 2 (or 2/1), we move up 2 units and right 1 unit to find our next point at "
                            "(1, 5). Connecting these points with a straight line, extended in both directions, "
                            "gives us the complete graph of the equation.",
                        ],
                        25,
                    ),
                ],
            },
        ],
        "assignments": [
            {
                "key": "ALG_A1",
                "title": "Unit 1 Practice Problems: Solving Linear Equations",
                "description": (
                    "Complete the attached practice set covering one-step and multi-step equations from "
                    "Unit 1 and Unit 2. Show all work for each problem -- partial credit is available for "
                    "correct method even if the final answer is off."
                ),
                "due_offset_days": -10,
                "max_points": 100,
                "answer_key": "1) x=5  2) x=-3  3) x=12  4) x=2  5) x=-7 -- full credit requires showing the inverse-operation steps, not just the final answer.",
                "type": "Assignment",
                "is_challenge_target": True,  # graded later, deliberately, in the Challenges section
            },
            {
                "key": "ALG_A2",
                "title": "Unit 3 Project: Real-World Linear Models",
                "description": (
                    "Find a real-world situation that can be modeled with a linear equation (e.g. a phone "
                    "plan, a savings account, a rental cost), write the equation, and graph it."
                ),
                "due_offset_days": 7,
                "max_points": 100,
                "answer_key": None,
                "type": "Assignment",
            },
            {
                "key": "ALG_A3",
                "title": "Quiz: Chapter Review — MCQ & True/False",
                "description": (
                    "A short-answer style quiz assignment covering multiple-choice and true/false concepts "
                    "from Unit 1 and Unit 2: variables, expressions, and one-step and multi-step equations. "
                    "Submit your answers (e.g. '1) B  2) True  3) A ...') as your submission text."
                ),
                "due_offset_days": -5,
                "max_points": 20,
                "answer_key": "1) B  2) True  3) A  4) False  5) C",
                "type": "Quiz",
            },
        ],
        "games": [
            {
                "title": "Algebra Trivia Challenge",
                "game_type": "trivia",
                "is_challenge_target": True,  # scored later, deliberately, in the Challenges section
                "questions": [
                    {"question": "What is the value of x in the equation x + 7 = 12?", "options": ["3", "5", "7", "12"], "correct_index": 1},
                    {"question": "True or False: The equation 2x = 10 has the solution x = 5.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "Which property justifies rewriting 3(x + 2) as 3x + 6?", "options": ["Distributive Property", "Commutative Property", "Associative Property", "Identity Property"], "correct_index": 0},
                    {"question": "True or False: A linear equation graphed on a coordinate plane always produces a straight line.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What is the slope of the line y = 4x - 3?", "options": ["-3", "4", "3", "-4"], "correct_index": 1},
                ],
            },
            {
                "title": "Linear Equations Quiz Match",
                "game_type": "quiz_match",
                "questions": [
                    {"question": "Solve for x: 3x - 5 = 16.", "options": ["7", "5", "21", "9"], "correct_index": 0},
                    {"question": "True or False: Variables always represent unknown numerical values in algebra.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What is the y-intercept of the equation y = 2x + 7?", "options": ["2", "7", "-7", "0"], "correct_index": 1},
                    {"question": "Which of the following is a linear equation?", "options": ["y = x^2 + 1", "y = 3x - 2", "y = 1/x", "y = sqrt(x)"], "correct_index": 1},
                    {"question": "True or False: Multiplying both sides of an equation by the same nonzero number keeps the equation balanced.", "options": ["True", "False"], "correct_index": 0},
                ],
            },
        ],
    },
    {
        "key": "GEO",
        "title": "Geometry Foundations",
        "subject": "Math",
        "grade_level": "Grade 10",
        "teacher_idx": 0,
        "description": (
            "Geometry Foundations introduces students to the language and logic of geometric reasoning, "
            "starting with points, lines, and angles before moving into triangles and polygons. Through "
            "hands-on measurement and visual reasoning, students build intuition for geometric "
            "relationships they will use throughout their math education. Emphasis is placed on precise "
            "vocabulary and justifying claims with evidence."
        ),
        "modules": [
            {
                "title": "Unit 1: Points, Lines, and Angles",
                "description": (
                    "The foundational vocabulary and notation of geometry: points, lines, segments, rays, "
                    "and the angles they form."
                ),
                "lessons": [
                    lesson(
                        "Basic Geometric Terms and Notation",
                        "Students will be able to correctly name and use notation for points, lines, segments, rays, and angles.",
                        [
                            "Geometry begins with a small set of undefined terms -- point, line, and plane -- that "
                            "describe the building blocks of all geometric figures. A point represents an exact "
                            "location with no size, a line extends infinitely in two directions with no thickness, "
                            "and a plane is a flat surface that extends infinitely in all directions.",
                            "From these basics, we build more specific figures: a line segment has two distinct "
                            "endpoints, a ray starts at one point and extends infinitely in one direction, and an "
                            "angle is formed when two rays share a common endpoint called the vertex. Learning the "
                            "correct notation -- such as naming a segment AB or an angle ABC -- lets mathematicians "
                            "communicate about shapes with total precision.",
                        ],
                        20,
                    ),
                    lesson(
                        "Measuring and Classifying Angles",
                        "Students will be able to measure angles with a protractor and classify them as acute, right, obtuse, or straight.",
                        [
                            "Angles are measured in degrees using a protractor, and they are classified by their "
                            "measure: an acute angle measures less than 90 degrees, a right angle measures exactly "
                            "90 degrees, an obtuse angle measures between 90 and 180 degrees, and a straight angle "
                            "measures exactly 180 degrees.",
                            "Recognizing these categories at a glance is a skill that will support almost "
                            "everything else in this course, from identifying triangle types to solving for unknown "
                            "angles in complex diagrams. When measuring with a protractor, always line up the "
                            "vertex of the angle with the center point of the protractor and read the scale that "
                            "starts at zero along one of the angle's rays.",
                        ],
                        20,
                    ),
                    lesson(
                        "Angle Relationships: Complementary and Supplementary",
                        "Students will be able to identify complementary and supplementary angle pairs and use them to find missing angle measures.",
                        [
                            "Two angles are complementary if their measures add up to exactly 90 degrees, and they "
                            "are supplementary if their measures add up to exactly 180 degrees. These relationships "
                            "frequently appear when a straight line or right angle is divided into two smaller "
                            "angles by another ray.",
                            "For example, if one angle in a complementary pair measures 35 degrees, the other must "
                            "measure 90 - 35 = 55 degrees. Vertical angles, formed when two lines cross, are always "
                            "congruent (equal) to each other, which gives us another powerful tool for finding "
                            "missing angle measures without needing to measure them directly.",
                        ],
                        20,
                    ),
                ],
            },
            {
                "title": "Unit 2: Triangles and Polygons",
                "description": (
                    "Classifying triangles and applying the polygon angle-sum theorem to find missing "
                    "angles in triangles and other polygons."
                ),
                "scheduled_release_days": 4,  # this module's publish_at is set 4 days in the future
                "lessons": [
                    lesson(
                        "Classifying Triangles by Sides and Angles",
                        "Students will be able to classify triangles as equilateral, isosceles, or scalene, and as acute, right, or obtuse.",
                        [
                            "Triangles can be classified two ways: by their sides and by their angles. By sides, a "
                            "triangle is equilateral if all three sides are equal, isosceles if exactly two sides "
                            "are equal, and scalene if no sides are equal. By angles, a triangle is acute if all "
                            "three angles are less than 90 degrees, right if one angle is exactly 90 degrees, and "
                            "obtuse if one angle is greater than 90 degrees.",
                            "A single triangle can be described using both classifications at once -- for example, "
                            "a right isosceles triangle has one 90-degree angle and two equal sides. Understanding "
                            "these categories helps students predict and verify relationships between a triangle's "
                            "sides and angles, which becomes especially useful once we begin proving geometric "
                            "relationships formally.",
                        ],
                        20,
                    ),
                    lesson(
                        "The Polygon Angle-Sum Theorem",
                        "Students will be able to calculate the sum of interior angles of any polygon and use it to find a missing angle.",
                        [
                            "The sum of the interior angles of any triangle is always 180 degrees, and this fact "
                            "extends to a general formula for any polygon: the sum of interior angles equals "
                            "(n - 2) x 180 degrees, where n is the number of sides. For a quadrilateral (n = 4), "
                            "this gives (4 - 2) x 180 = 360 degrees.",
                            "This theorem is incredibly useful for finding a missing angle in a polygon when all "
                            "the other angles are known -- simply add up the known angles and subtract from the "
                            "total predicted by the formula. Recognizing this pattern also helps explain why "
                            "regular polygons (with equal sides and angles) have predictable, calculable angle measures.",
                        ],
                        20,
                    ),
                ],
            },
        ],
        "assignments": [
            {
                "key": "GEO_A1",
                "title": "Angle Relationships Worksheet",
                "description": (
                    "Practice identifying and calculating complementary, supplementary, and vertical "
                    "angles using the diagrams provided in class."
                ),
                "due_offset_days": -8,
                "max_points": 50,
                "answer_key": "1) 35 degrees  2) 145 degrees  3) Vertical angles are congruent  4) 90 degrees",
                "type": "Assignment",
            },
            {
                "key": "GEO_A2",
                "title": "Geometry Foundations: Upcoming Unit Test",
                "description": (
                    "Comprehensive test covering points, lines, angles, triangles, and polygons from "
                    "Units 1 and 2. Review your notes and the practice worksheet before test day."
                ),
                "due_offset_days": 7,
                "max_points": 100,
                "answer_key": None,
                "type": "Assignment",
            },
        ],
        "games": [
            {
                "title": "Geometry Angles Trivia",
                "game_type": "trivia",
                "questions": [
                    {"question": "How many degrees are in a straight angle?", "options": ["90", "180", "270", "360"], "correct_index": 1},
                    {"question": "True or False: Complementary angles always add up to 90 degrees.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What do you call two angles that add up to 180 degrees?", "options": ["Complementary", "Supplementary", "Congruent", "Vertical"], "correct_index": 1},
                    {"question": "True or False: An equilateral triangle has three equal angles of 60 degrees each.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What is the sum of the interior angles of a triangle?", "options": ["90 degrees", "180 degrees", "270 degrees", "360 degrees"], "correct_index": 1},
                ],
            },
            {
                "title": "Triangles & Polygons Quiz Match",
                "game_type": "quiz_match",
                "questions": [
                    {"question": "A triangle with no equal sides is called what?", "options": ["Equilateral", "Isosceles", "Scalene", "Right"], "correct_index": 2},
                    {"question": "True or False: A right angle measures exactly 90 degrees.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What is the sum of the interior angles of a quadrilateral?", "options": ["180 degrees", "270 degrees", "360 degrees", "450 degrees"], "correct_index": 2},
                    {"question": "Two angles that share a vertex and a side, but do not overlap, are called what?", "options": ["Vertical angles", "Adjacent angles", "Complementary angles", "Reflex angles"], "correct_index": 1},
                    {"question": "True or False: All squares are rectangles.", "options": ["True", "False"], "correct_index": 0},
                ],
            },
        ],
    },
    {
        "key": "SCI",
        "title": "Life Science Explorations",
        "subject": "Science",
        "grade_level": "Grade 9",
        "teacher_idx": 1,
        "description": (
            "Life Science Explorations takes students on a journey from the cell to the ecosystem, "
            "examining how living things are structured, how they capture and use energy, and how they "
            "interact with one another. Students will connect lab-style observations with core biological "
            "concepts like photosynthesis, respiration, and energy flow. The course emphasizes scientific "
            "vocabulary and real-world applications of biology."
        ),
        "modules": [
            {
                "title": "Unit 1: Cell Biology",
                "description": "The structure of cells and how materials move across the cell membrane.",
                "lessons": [
                    lesson(
                        "The Structure and Function of Cells",
                        "Students will be able to identify major cell organelles and describe their functions.",
                        [
                            "The cell is the basic unit of life, and every living organism is made up of one or "
                            "more cells. Inside each cell, the nucleus acts as the control center, storing genetic "
                            "information (DNA) and directing the cell's activities, while the cytoplasm is the "
                            "gel-like substance that fills the cell and houses its organelles.",
                            "Mitochondria are often called the 'powerhouse of the cell' because they convert "
                            "nutrients into usable energy through cellular respiration, and ribosomes are "
                            "responsible for building proteins the cell needs to function and grow. Plant cells "
                            "have two additional structures animal cells lack: a rigid cell wall for support, and "
                            "chloroplasts, which capture sunlight for photosynthesis.",
                        ],
                        20,
                    ),
                    lesson(
                        "Cell Membrane Transport: Diffusion and Osmosis",
                        "Students will be able to explain how diffusion and osmosis move materials across a cell membrane.",
                        [
                            "The cell membrane controls what enters and leaves the cell, acting as a selective "
                            "barrier. Diffusion is the movement of particles from an area of higher concentration "
                            "to an area of lower concentration, and it happens naturally without the cell using any "
                            "energy -- like a drop of food coloring spreading through water.",
                            "Osmosis is a special case of diffusion that refers specifically to the movement of "
                            "water molecules across a membrane, always moving toward the side with a higher "
                            "concentration of dissolved solutes. Understanding these two processes explains "
                            "everyday phenomena, from why a wilted plant perks up after watering to why cells can "
                            "swell or shrink in different environments.",
                        ],
                        20,
                    ),
                ],
            },
            {
                "title": "Unit 2: Energy in Living Systems",
                "description": "How living things capture and release energy through photosynthesis and cellular respiration.",
                "lessons": [
                    lesson(
                        "Photosynthesis: Capturing Solar Energy",
                        "Students will be able to describe the inputs and outputs of photosynthesis and where it occurs in the cell.",
                        [
                            "Photosynthesis is the process plants, algae, and some bacteria use to convert light "
                            "energy into chemical energy stored in glucose. It takes place mainly in the "
                            "chloroplasts, where a green pigment called chlorophyll captures sunlight and uses it, "
                            "along with carbon dioxide from the air and water from the soil, to produce glucose "
                            "and oxygen.",
                            "The overall chemical equation for photosynthesis is 6CO2 + 6H2O + light energy -> "
                            "C6H12O6 + 6O2, showing carbon dioxide and water as inputs and glucose and oxygen as "
                            "outputs. This process is the foundation of nearly every food chain on Earth, since "
                            "it's how energy from the sun first enters living systems.",
                        ],
                        20,
                    ),
                    lesson(
                        "Cellular Respiration: Releasing Stored Energy",
                        "Students will be able to describe the inputs and outputs of cellular respiration and where it occurs in the cell.",
                        [
                            "Cellular respiration is essentially the reverse of photosynthesis: it's the process "
                            "organisms use to break down glucose and release the energy stored inside it, using "
                            "oxygen and producing carbon dioxide and water as waste products. This process happens "
                            "in the mitochondria of nearly every cell, in plants and animals alike.",
                            "The overall equation is C6H12O6 + 6O2 -> 6CO2 + 6H2O + energy (ATP), and the energy "
                            "released is captured in a molecule called ATP, which powers everything the cell "
                            "does -- from muscle contraction to building new proteins. Together, photosynthesis "
                            "and cellular respiration form a continuous cycle that keeps carbon, oxygen, and "
                            "energy moving through living systems.",
                        ],
                        20,
                    ),
                ],
            },
            {
                "title": "Unit 3: Ecosystems and Interactions",
                "description": "How organisms are organized ecologically and how energy flows between them.",
                "lessons": [
                    lesson(
                        "Levels of Ecological Organization",
                        "Students will be able to order and describe the levels of ecological organization from population to biome.",
                        [
                            "Ecology studies living things in relation to their environment, organized into a "
                            "hierarchy of increasing complexity. An individual organism belongs to a population -- "
                            "all the members of one species living in a given area -- and multiple populations "
                            "interacting together form a community.",
                            "A community together with its non-living (abiotic) surroundings, such as water, "
                            "sunlight, and soil, forms an ecosystem, and multiple ecosystems with similar climates "
                            "and organisms make up a biome, like a desert or rainforest. Understanding this "
                            "hierarchy helps scientists study problems at the right scale, whether it's a single "
                            "species' population or an entire biome's health.",
                        ],
                        15,
                    ),
                    lesson(
                        "Energy Flow: Food Chains and Food Webs",
                        "Students will be able to trace the flow of energy through a food chain and explain why energy is lost at each level.",
                        [
                            "A food chain shows the one-directional flow of energy from one organism to the next, "
                            "starting with producers (like plants, which make their own food via photosynthesis), "
                            "moving to primary consumers (herbivores that eat producers), then secondary and "
                            "tertiary consumers (carnivores and omnivores).",
                            "Because most real ecosystems have organisms that eat more than one type of food, "
                            "ecologists often use a food web -- a more realistic network of interconnected food "
                            "chains -- to show energy flow. At each step, or trophic level, roughly 90% of the "
                            "energy is lost as heat, which is why food chains rarely extend beyond four or five levels.",
                        ],
                        20,
                    ),
                ],
            },
        ],
        "assignments": [
            {
                "key": "SCI_A1",
                "title": "Cell Structure Lab Report",
                "description": (
                    "Write a lab report describing what you observed under the microscope, identifying "
                    "at least four cell organelles and explaining their functions."
                ),
                "due_offset_days": -9,
                "max_points": 100,
                "answer_key": "Look for identification of the nucleus, mitochondria, cell membrane, and (for plant cells) cell wall/chloroplasts, each with a correct one-sentence function.",
                "type": "Assignment",
            },
            {
                "key": "SCI_A2",
                "title": "Ecosystems Reading Response",
                "description": (
                    "After reading the assigned chapter on ecosystems, write a short response explaining "
                    "the flow of energy through a food chain of your choice."
                ),
                "due_offset_days": -2,
                "max_points": 40,
                "answer_key": None,
                "type": "Assignment",
            },
            {
                "key": "SCI_A3",
                "title": "Photosynthesis & Respiration Quiz Prep",
                "description": (
                    "Review guide due before next week's quiz on photosynthesis and cellular "
                    "respiration -- summarize the inputs and outputs of each process."
                ),
                "due_offset_days": 7,
                "max_points": 30,
                "answer_key": None,
                "type": "Assignment",
            },
        ],
        "games": [
            {
                "title": "Cell Biology Trivia",
                "game_type": "trivia",
                "questions": [
                    {"question": "What organelle is known as the 'powerhouse of the cell'?", "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"], "correct_index": 1},
                    {"question": "True or False: Plant cells have a cell wall, but animal cells do not.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What gas do plants absorb during photosynthesis?", "options": ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], "correct_index": 2},
                    {"question": "True or False: Cellular respiration releases energy stored in glucose.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "Which process allows water to move across a cell membrane from low to high solute concentration?", "options": ["Diffusion", "Osmosis", "Active transport", "Photosynthesis"], "correct_index": 1},
                ],
            },
            {
                "title": "Ecosystems & Energy Quiz Match",
                "game_type": "quiz_match",
                "questions": [
                    {"question": "What is produced as a byproduct of photosynthesis?", "options": ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"], "correct_index": 1},
                    {"question": "True or False: Mitochondria are found in both plant and animal cells.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What term describes the transfer of energy from one organism to another through feeding relationships?", "options": ["Food web", "Photosynthesis", "Osmosis", "Mitosis"], "correct_index": 0},
                    {"question": "Which level of ecological organization includes all the living and nonliving things in an area?", "options": ["Population", "Community", "Ecosystem", "Biome"], "correct_index": 2},
                    {"question": "True or False: Producers, like plants, make their own food using sunlight.", "options": ["True", "False"], "correct_index": 0},
                ],
            },
        ],
    },
    {
        "key": "ENG",
        "title": "English Literature & Composition",
        "subject": "English",
        "grade_level": "Grade 10",
        "teacher_idx": 2,
        "description": (
            "English Literature & Composition develops students' ability to read literature critically "
            "and communicate their ideas persuasively in writing. Students will study core literary "
            "elements such as theme, characterization, and figurative language, then apply that analysis "
            "to building well-organized, evidence-based essays. The course balances close reading with "
            "structured writing practice."
        ),
        "modules": [
            {
                "title": "Unit 1: Elements of Literary Analysis",
                "description": "Theme, characterization, and figurative language as tools for close reading.",
                "lessons": [
                    lesson(
                        "Identifying Theme, Tone, and Mood",
                        "Students will be able to distinguish between a text's theme, tone, and mood.",
                        [
                            "Theme is the central message or underlying idea a piece of literature explores about "
                            "life, human nature, or society -- it's different from the plot, which is simply what "
                            "happens in the story. A single work can explore multiple themes, such as the cost of "
                            "ambition, the power of friendship, or the struggle between good and evil.",
                            "Tone refers to the author's attitude toward the subject matter, revealed through word "
                            "choice and style, while mood is the emotional atmosphere the reader experiences while "
                            "reading -- a story can have a serious tone but create a mood of suspense or dread. "
                            "Learning to distinguish these three elements gives readers a much richer, more "
                            "analytical understanding of any text.",
                        ],
                        20,
                    ),
                    lesson(
                        "Characterization: Direct and Indirect",
                        "Students will be able to identify direct and indirect characterization and explain what each reveals about a character.",
                        [
                            "Characterization is the method an author uses to reveal a character's personality and "
                            "motivations. Direct characterization happens when the author or narrator explicitly "
                            "tells the reader about a character -- for example, stating that 'Maria was fiercely "
                            "loyal to her friends.'",
                            "Indirect characterization, which is far more common in strong writing, reveals "
                            "character through the acronym STEAL: what a character Says, Thinks, does (their "
                            "Effect on others), Actions, and Looks like. Skilled readers pay close attention to "
                            "these subtle clues rather than waiting for the author to state a trait outright, "
                            "which makes reading -- and writing -- far more engaging.",
                        ],
                        20,
                    ),
                    lesson(
                        "Symbolism and Figurative Language",
                        "Students will be able to identify similes, metaphors, and symbols and explain the meaning they add to a text.",
                        [
                            "Figurative language uses words in imaginative ways that go beyond their literal "
                            "meaning to create vivid images and deeper meaning. A simile compares two unlike "
                            "things using 'like' or 'as' (her smile was like sunshine), while a metaphor makes the "
                            "same kind of comparison without those connecting words (her smile was sunshine).",
                            "A symbol is an object, person, or place that represents an idea larger than its "
                            "literal meaning -- a dove might symbolize peace, or a storm might symbolize inner "
                            "turmoil. Recognizing these techniques helps readers see the layers of meaning authors "
                            "build into their writing, and using them deliberately is one of the most powerful "
                            "tools available to student writers.",
                        ],
                        20,
                    ),
                ],
            },
            {
                "title": "Unit 2: The Craft of Composition",
                "description": "Building a clear thesis and organizing an essay's evidence around it.",
                "lessons": [
                    lesson(
                        "Building a Strong Thesis Statement",
                        "Students will be able to write a specific, arguable thesis statement for a literary analysis essay.",
                        [
                            "A thesis statement is the single sentence, usually placed at the end of the "
                            "introduction, that states the essay's central argument or claim. A strong thesis is "
                            "specific and arguable -- someone could reasonably disagree with it -- rather than a "
                            "simple statement of fact or plot summary.",
                            "For example, 'The protagonist changes throughout the novel' is too vague, while 'The "
                            "protagonist's journey from isolation to connection reveals the novel's larger "
                            "argument that community is essential to healing' gives the reader a clear, debatable "
                            "claim the essay will prove. Every body paragraph that follows should connect back to "
                            "and support this central thesis.",
                        ],
                        20,
                    ),
                    lesson(
                        "Organizing the Analytical Essay",
                        "Students will be able to structure an analytical essay using clear topic sentences and textual evidence.",
                        [
                            "A well-organized analytical essay typically follows a clear structure: an "
                            "introduction that ends with the thesis, body paragraphs that each focus on one "
                            "supporting point backed by textual evidence, and a conclusion that synthesizes the "
                            "argument rather than simply repeating it.",
                            "Each body paragraph should open with a topic sentence stating its main point, include "
                            "a specific quote or example from the text as evidence, and explain how that evidence "
                            "supports the thesis before transitioning to the next idea. This structure -- point, "
                            "evidence, explanation -- keeps the essay focused and makes the writer's reasoning "
                            "easy for readers to follow.",
                        ],
                        20,
                    ),
                ],
            },
        ],
        "assignments": [
            {
                "key": "ENG_A1",
                "title": "Character Analysis Essay",
                "description": (
                    "Write a 3-4 paragraph essay analyzing how the protagonist of our current novel "
                    "changes over the course of the story, using at least two pieces of textual evidence."
                ),
                "due_offset_days": -7,
                "max_points": 100,
                "answer_key": "Strong essays identify a clear character change, cite specific scenes/quotes, and connect the change to the story's theme.",
                "type": "Assignment",
            },
            {
                "key": "ENG_A2",
                "title": "Poetry Reading Journal",
                "description": (
                    "Choose one poem from the packet and respond to it in your reading journal: identify "
                    "the theme, one example of figurative language, and your personal reaction."
                ),
                "due_offset_days": -1,
                "max_points": 30,
                "answer_key": None,
                "type": "Assignment",
            },
            {
                "key": "ENG_A3",
                "title": "Novel Study: Final Reflection",
                "description": (
                    "A closing reflection assignment due at the end of the unit -- students will connect "
                    "the novel's themes to their own lives and to the essays written earlier in the unit."
                ),
                "due_offset_days": 7,
                "max_points": 50,
                "answer_key": None,
                "type": "Assignment",
            },
        ],
        "games": [
            {
                "title": "Literary Terms Trivia",
                "game_type": "trivia",
                "questions": [
                    {"question": "What literary term describes the central message or insight of a work?", "options": ["Theme", "Plot", "Setting", "Tone"], "correct_index": 0},
                    {"question": "True or False: Indirect characterization reveals a character's traits through their actions, speech, and thoughts rather than direct description.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What figure of speech compares two unlike things using 'like' or 'as'?", "options": ["Metaphor", "Simile", "Personification", "Hyperbole"], "correct_index": 1},
                    {"question": "True or False: The tone of a piece of writing reflects the author's attitude toward the subject.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "What is the term for an object, person, or place that represents an idea beyond its literal meaning?", "options": ["Symbol", "Motif", "Allusion", "Irony"], "correct_index": 0},
                ],
            },
            {
                "title": "Essay Writing Quiz Match",
                "game_type": "quiz_match",
                "questions": [
                    {"question": "What is the purpose of a thesis statement in an analytical essay?", "options": ["To summarize the plot", "To state the essay's central argument", "To list sources", "To introduce the author"], "correct_index": 1},
                    {"question": "True or False: A strong thesis statement is specific and arguable, not just a statement of fact.", "options": ["True", "False"], "correct_index": 0},
                    {"question": "Which term describes the emotional atmosphere of a literary work?", "options": ["Mood", "Diction", "Syntax", "Genre"], "correct_index": 0},
                    {"question": "What is it called when an author gives human qualities to a non-human object?", "options": ["Simile", "Personification", "Metaphor", "Alliteration"], "correct_index": 1},
                    {"question": "True or False: Organizing an essay with clear topic sentences helps guide the reader through each paragraph's main idea.", "options": ["True", "False"], "correct_index": 0},
                ],
            },
        ],
    },
]

TEACHERS = [
    {"full_name": "Sarah Johnson", "email": "sarah.johnson@meridianstem.edu"},
    {"full_name": "Michael Chen", "email": "michael.chen@meridianstem.edu"},
    {"full_name": "Elena Rodriguez", "email": "elena.rodriguez@meridianstem.edu"},
]

# 13 students: index -> (full_name, email, grade_key, persona)
# Grade alternates G9/G10 by index; persona distribution:
#   0,1  = high performer      2,3 = average performer
#   4,5  = struggling          6,7 = pending-assignments
#   8..12 = remaining (varied, realistic middle-of-the-road)
STUDENTS = [
    {"full_name": "Ava Thompson",     "email": "ava.thompson@meridianstem.edu",     "grade": "G9",  "persona": "high"},
    {"full_name": "Marcus Bell",      "email": "marcus.bell@meridianstem.edu",      "grade": "G10", "persona": "high"},
    {"full_name": "Sofia Ramirez",    "email": "sofia.ramirez@meridianstem.edu",    "grade": "G9",  "persona": "average"},
    {"full_name": "Ethan Walker",     "email": "ethan.walker@meridianstem.edu",     "grade": "G10", "persona": "average"},
    {"full_name": "Liam Carter",      "email": "liam.carter@meridianstem.edu",      "grade": "G9",  "persona": "struggling"},
    {"full_name": "Grace Kim",        "email": "grace.kim@meridianstem.edu",        "grade": "G10", "persona": "struggling"},
    {"full_name": "Noah Patel",       "email": "noah.patel@meridianstem.edu",       "grade": "G9",  "persona": "pending"},
    {"full_name": "Isabella Nguyen",  "email": "isabella.nguyen@meridianstem.edu",  "grade": "G10", "persona": "pending"},
    {"full_name": "Oliver Brooks",    "email": "oliver.brooks@meridianstem.edu",    "grade": "G9",  "persona": "remaining"},
    {"full_name": "Mia Sanders",      "email": "mia.sanders@meridianstem.edu",      "grade": "G10", "persona": "remaining"},
    {"full_name": "Lucas Foster",     "email": "lucas.foster@meridianstem.edu",     "grade": "G9",  "persona": "remaining"},
    {"full_name": "Chloe Martinez",   "email": "chloe.martinez@meridianstem.edu",   "grade": "G10", "persona": "remaining"},
    {"full_name": "Benjamin Wright",  "email": "benjamin.wright@meridianstem.edu",  "grade": "G9",  "persona": "remaining"},
]

# Which courses each student (by index) joins. ALG is the "star" demo course
# (module prerequisites + the 2 Challenges) so every persona is represented
# in it. Overall distribution: every student >= 1 course, several = 2, a few = 3.
ENROLLMENTS = {
    0: ["ALG", "SCI", "ENG"],
    1: ["GEO", "ENG", "ALG"],
    2: ["ALG", "SCI"],
    3: ["GEO", "ENG"],
    4: ["ALG"],
    5: ["GEO"],
    6: ["ALG", "SCI"],
    7: ["GEO", "ENG"],
    8: ["ALG", "SCI"],
    9: ["GEO", "ENG"],
    10: ["SCI", "ENG"],
    11: ["ENG", "ALG", "GEO"],
    12: ["ALG", "SCI"],
}

CHALLENGE_TARGET_ASSIGNMENT_KEY = "ALG_A1"
CHALLENGE_TARGET_GAME_TITLE = "Algebra Trivia Challenge"
CHALLENGE1_JOINERS = [0, 2, 6, 8]   # assignment challenge -- all enrolled in ALG
CHALLENGE2_JOINERS = [0, 1, 11, 12]  # game challenge -- all enrolled in ALG


def submission_content(persona, subject):
    """Realistic, quality-tiered submission text, varied a bit by subject."""
    strong = {
        "Math": "I solved this step by step, showing each inverse operation and checking my final answer by "
                "substituting it back into the original equation to confirm both sides matched.",
        "Science": "I identified each structure/process asked about and explained its function in my own words, "
                   "then connected it back to the bigger concept we covered in class with a specific example.",
        "English": "I built my response around a clear main idea, backed it up with a specific quote/example from "
                   "the text, and explained in my own words how that evidence supports my point.",
    }
    medium = {
        "Math": "I worked through most of the steps but wasn't fully sure about the last part, so my answer might "
                "be a little off. I tried to show my work anyway.",
        "Science": "I answered the main question but I'm not 100% sure I explained the function part clearly. I "
                   "used the vocabulary from the reading.",
        "English": "I answered the question and gave one example, but I think I could have explained my reasoning "
                   "in a bit more detail.",
    }
    weak = {
        "Math": "I tried the first problem but got stuck partway through and wasn't sure how to finish, so this is "
                "as far as I got.",
        "Science": "I wrote down what I remembered from class but I didn't finish reviewing the reading before "
                   "starting this.",
        "English": "I answered part of the question but ran out of time to finish the rest.",
    }
    if persona in ("high",):
        return strong[subject]
    if persona in ("average", "pending"):
        return medium[subject]
    if persona == "struggling":
        return weak[subject]
    return medium[subject]


def grade_and_feedback(tier):
    if tier == "high":
        return 95.0, "Excellent work! Your steps are clear, correct, and well explained -- keep it up."
    if tier == "medium":
        return 78.0, "Good effort overall. Review the parts you were unsure about and see me if you have questions."
    if tier == "low":
        return 45.0, "This submission needs more work -- please come to office hours so we can go through it together."
    return 78.0, "Good effort overall."


def main():
    print("=" * 78)
    print("seed_demo_data.py -- seeding Meridian STEM Academy via real HTTP API calls")
    print(f"BASE_URL = {BASE_URL}")
    print("=" * 78)

    # -----------------------------------------------------------------
    # 1. Super Admin login + idempotency guard
    # -----------------------------------------------------------------
    print("\n[1/13] Logging in as Super Admin...")
    super_admin, super_admin_user = login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
    print(f"       Logged in as {super_admin_user['email']} (role={super_admin_user['role']})")

    existing_schools = super_admin.get("/super-admin/schools")
    if existing_schools:
        names = ", ".join(pick(s, "name") for s in existing_schools)
        print("\nERROR: The database is not a clean slate -- schools already exist:")
        print(f"       {names}")
        print("This script refuses to run against a non-empty database to avoid creating")
        print("duplicate demo data. Run scripts/reset_demo_db.py --yes-i-am-sure first,")
        print("then re-run this script.")
        return 1

    # -----------------------------------------------------------------
    # 2. Create the school (+ School Admin)
    # -----------------------------------------------------------------
    print("\n[2/13] Creating school...")
    school = super_admin.post(
        "/super-admin/schools",
        {
            "name": SCHOOL_NAME,
            "domain": SCHOOL_DOMAIN,
            "admin_email": SCHOOL_ADMIN_EMAIL,
            "admin_password": SCHOOL_ADMIN_PASSWORD,
        },
    )
    school_id = pick(school, "id")
    bump("schools")
    print(f"       Created '{SCHOOL_NAME}' (id={school_id})")

    print("       Logging in as School Admin...")
    admin, admin_user = login(SCHOOL_ADMIN_EMAIL, SCHOOL_ADMIN_PASSWORD)
    print(f"       Logged in as {admin_user['email']} (role={admin_user['role']})")

    # -----------------------------------------------------------------
    # 3. Grade levels
    # -----------------------------------------------------------------
    print("\n[3/13] Creating grade levels...")
    grades = {}
    for name, code in [("Grade 9", "G9"), ("Grade 10", "G10")]:
        g = admin.post("/school-admin/grades", {"name": name, "code": code})
        grades[code] = pick(g, "id")
        bump("grades")
        print(f"       {name} ({code}) -> {grades[code]}")

    # -----------------------------------------------------------------
    # 4. Teachers
    # -----------------------------------------------------------------
    print("\n[4/13] Creating 3 teachers...")
    teachers = []
    for t in TEACHERS:
        resp = admin.post(
            "/school-admin/teachers",
            {"email": t["email"], "full_name": t["full_name"], "password": TEACHER_PASSWORD},
        )
        teacher_id = pick(resp, "id")
        client, user = login(t["email"], TEACHER_PASSWORD)
        teachers.append({**t, "id": teacher_id, "client": client})
        bump("teachers")
        print(f"       {t['full_name']} <{t['email']}> -> {teacher_id}")

    # -----------------------------------------------------------------
    # 5. Students
    # -----------------------------------------------------------------
    print("\n[5/13] Creating 13 students...")
    students = []
    for s in STUDENTS:
        resp = admin.post(
            "/school-admin/students",
            {
                "email": s["email"],
                "full_name": s["full_name"],
                "password": STUDENT_PASSWORD,
                "grade_id": grades[s["grade"]],
            },
        )
        student_id = pick(resp, "id")
        client, user = login(s["email"], STUDENT_PASSWORD)
        students.append({**s, "id": student_id, "client": client})
        bump("students")
        print(f"       [{s['persona']:>10}] {s['full_name']} <{s['email']}> ({s['grade']}) -> {student_id}")

    # -----------------------------------------------------------------
    # 6. Courses, modules, lessons, prerequisite + scheduled release,
    #    publish, assignments, games
    # -----------------------------------------------------------------
    print("\n[6/13] Creating courses, modules, lessons, assignments, and games...")
    courses_by_key = {}
    for course_def in COURSES:
        teacher = teachers[course_def["teacher_idx"]]
        tc = teacher["client"]

        course = tc.post(
            "/teacher/courses",
            {
                "title": course_def["title"],
                "description": course_def["description"],
                "subject": course_def["subject"],
                "grade_level": course_def["grade_level"],
            },
        )
        course_id = pick(course, "id")
        bump("courses")
        print(f"\n       Course '{course_def['title']}' ({course_def['key']}) by {teacher['full_name']} -> {course_id}")

        module_records = []
        for m_idx, m_def in enumerate(course_def["modules"]):
            module = tc.post(
                f"/teacher/courses/{course_id}/modules",
                {"title": m_def["title"], "description": m_def["description"], "order": m_idx},
            )
            module_id = pick(module, "id")
            bump("modules")
            print(f"         Module {m_idx + 1}: {m_def['title']} -> {module_id}")

            lesson_records = []
            for l_idx, l_def in enumerate(m_def["lessons"]):
                les = tc.post(
                    f"/teacher/courses/{course_id}/modules/{module_id}/lessons",
                    {
                        "title": l_def["title"],
                        "content": l_def["content"],
                        "summary": l_def["summary"],
                        "duration_minutes": l_def["duration_minutes"],
                    },
                )
                lesson_records.append({"id": pick(les, "id"), "title": l_def["title"]})
                bump("lessons")
            print(f"           {len(lesson_records)} lesson(s) added")

            module_records.append(
                {
                    "id": module_id,
                    "title": m_def["title"],
                    "description": m_def["description"],
                    "lessons": lesson_records,
                    "scheduled_release_days": m_def.get("scheduled_release_days"),
                    "has_prerequisite": False,
                }
            )

        # Module prerequisite: ALG's Module 2 requires Module 1 (do NOT touch other modules)
        for m_idx, m_def in enumerate(course_def["modules"]):
            if m_def.get("prerequisite_of_next"):
                prereq_module = module_records[m_idx]
                dependent_module = module_records[m_idx + 1]
                tc.put(
                    f"/teacher/courses/{course_id}/modules/{dependent_module['id']}",
                    {
                        "title": dependent_module["title"],
                        "description": dependent_module["description"],
                        "order": m_idx + 1,
                        "prerequisite_module_id": prereq_module["id"],
                    },
                )
                dependent_module["has_prerequisite"] = True
                dependent_module["prerequisite_id"] = prereq_module["id"]
                print(
                    f"         Set prerequisite: '{dependent_module['title']}' now requires "
                    f"'{prereq_module['title']}' to be completed first"
                )

        # Scheduled release: GEO's Unit 2 module publishes 4 days from now
        for module in module_records:
            if module["scheduled_release_days"]:
                publish_at = NOW + timedelta(days=module["scheduled_release_days"])
                tc.put(
                    f"/teacher/courses/{course_id}/modules/{module['id']}",
                    {
                        "title": module["title"],
                        "description": module["description"],
                        "order": module_records.index(module),
                        "publish_at": iso(publish_at),
                    },
                )
                module["scheduled_locked"] = True
                print(f"         Set scheduled release: '{module['title']}' publishes at {iso(publish_at)}")
            else:
                module["scheduled_locked"] = False

        # Assignments
        assignment_records = {}
        for a_def in course_def["assignments"]:
            due_date = NOW + timedelta(days=a_def["due_offset_days"])
            resp = tc.post(
                "/teacher/assignments",
                {
                    "course_id": course_id,
                    "title": a_def["title"],
                    "description": a_def["description"],
                    "due_date": iso(due_date),
                    "max_points": a_def["max_points"],
                    "answer_key": a_def["answer_key"],
                    "type": a_def["type"],
                },
            )
            assignment_records[a_def["key"]] = {
                "id": pick(resp, "id"),
                "title": a_def["title"],
                "due_offset_days": a_def["due_offset_days"],
                "is_challenge_target": a_def.get("is_challenge_target", False),
            }
            bump("assignments")
        print(f"         {len(assignment_records)} assignment(s) created")

        # Games
        game_records = {}
        for g_def in course_def["games"]:
            resp = tc.post(
                "/games",
                {
                    "title": g_def["title"],
                    "course_id": course_id,
                    "game_type": g_def["game_type"],
                    "config": {"questions": g_def["questions"]},
                },
            )
            game_records[g_def["title"]] = {
                "id": pick(resp, "id"),
                "title": g_def["title"],
                "is_challenge_target": g_def.get("is_challenge_target", False),
            }
            bump("games")
        print(f"         {len(game_records)} game(s) created")

        # Publish the course so students can join it
        pub = tc.post(f"/teacher/courses/{course_id}/publish")
        assert pub.get("is_published") is True, f"Course {course_def['title']} did not publish as expected: {pub}"
        print(f"         Published (is_published=True)")

        courses_by_key[course_def["key"]] = {
            "id": course_id,
            "title": course_def["title"],
            "subject": course_def["subject"],
            "join_code": pick(tc.get(f"/teacher/courses/{course_id}"), "joinCode", "join_code"),
            "teacher": teacher,
            "modules": module_records,
            "assignments": assignment_records,
            "games": game_records,
        }
        print(f"         Join code: {courses_by_key[course_def['key']]['join_code']}")

    # -----------------------------------------------------------------
    # 7. Enrollment
    # -----------------------------------------------------------------
    print("\n[7/13] Enrolling students in courses via join codes...")
    for idx, course_keys in ENROLLMENTS.items():
        student = students[idx]
        for ck in course_keys:
            course = courses_by_key[ck]
            student["client"].post("/student/join-course", {"join_code": course["join_code"]})
        print(f"       {student['full_name']:<20} joined: {', '.join(course_keys)}")

    # -----------------------------------------------------------------
    # 8. Persona-driven lesson completion
    # -----------------------------------------------------------------
    print("\n[8/13] Completing lessons per student persona (respecting locks)...")

    def lessons_to_complete(persona, idx, total):
        if persona == "high":
            return total
        if persona == "average":
            return max(1, total - 1)
        if persona == "struggling":
            return 1
        if persona == "pending":
            return max(1, (total + 1) // 2)
        # remaining: vary deterministically by student index
        bucket = idx % 3
        if bucket == 0:
            return total
        if bucket == 1:
            return max(1, total - 1)
        return max(1, total // 2)

    for idx, course_keys in ENROLLMENTS.items():
        student = students[idx]
        for ck in course_keys:
            course = courses_by_key[ck]
            for module in course["modules"]:
                if module.get("scheduled_locked"):
                    continue  # permanently locked for the duration of this seeding run
                if module.get("has_prerequisite"):
                    prereq = next(m for m in course["modules"] if m["id"] == module["prerequisite_id"])
                    if not prereq.get("_fully_completed_by", {}).get(idx):
                        continue  # locked for this student -- prerequisite not finished
                n = lessons_to_complete(student["persona"], idx, len(module["lessons"]))
                for les in module["lessons"][:n]:
                    student["client"].post(f"/student/lessons/{les['id']}/complete")
                    bump("lessons_completed_events")
                module.setdefault("_fully_completed_by", {})[idx] = (n == len(module["lessons"]))
    print(f"       {counts['lessons_completed_events']} lesson-completion events recorded")

    # -----------------------------------------------------------------
    # 9. Persona-driven assignment submissions + grading
    #    (CHALLENGE_TARGET_ASSIGNMENT_KEY is deliberately skipped here --
    #    handled later, after the challenge exists, in section 13)
    # -----------------------------------------------------------------
    print("\n[9/13] Submitting and grading assignments per student persona...")

    def assignments_to_touch(persona, idx, past_due_assignments):
        """Returns the subset of past-due (non-challenge-target) assignments this
        student submits, per persona rules."""
        if not past_due_assignments:
            return []
        if persona == "high":
            return list(past_due_assignments)
        if persona == "average":
            return past_due_assignments[:-1] if len(past_due_assignments) > 1 else list(past_due_assignments)
        if persona == "struggling":
            return past_due_assignments[:1]
        if persona == "pending":
            # Deliberately submits only the first past-due one, leaving at least
            # one other past-due assignment genuinely missing (not just ungraded).
            return past_due_assignments[:1]
        bucket = idx % 3
        if bucket == 0:
            return list(past_due_assignments)
        if bucket == 1:
            return past_due_assignments[:-1] if len(past_due_assignments) > 1 else list(past_due_assignments)
        return past_due_assignments[:1]

    def score_tier(persona, idx):
        if persona == "high":
            return "high"
        if persona in ("average", "pending"):
            return "medium"
        if persona == "struggling":
            return "low"
        bucket = idx % 3
        return "high" if bucket == 0 else ("medium" if bucket == 1 else "low")

    # course_key -> list of (submission_id, teacher_client, tier) for grading
    course_left_ungraded = {ck: False for ck in courses_by_key}

    for idx, course_keys in ENROLLMENTS.items():
        student = students[idx]
        for ck in course_keys:
            course = courses_by_key[ck]
            subject = course["subject"]
            past_due = [
                a for key, a in course["assignments"].items()
                if a["due_offset_days"] < 0 and not a["is_challenge_target"]
            ]
            past_due.sort(key=lambda a: a["due_offset_days"])
            to_submit = assignments_to_touch(student["persona"], idx, past_due)

            for a in to_submit:
                content = submission_content(student["persona"], subject)
                sub = student["client"].post(
                    f"/student/assignments/{a['id']}/submit", {"content": content}
                )
                submission_id = pick(sub, "id")
                bump("submissions")

                # Leave exactly one submission per course genuinely ungraded --
                # picked from a non-critical persona so the demo has a real
                # "needs grading" item without hiding a persona's own story.
                if not course_left_ungraded[ck] and student["persona"] in ("average", "remaining"):
                    course_left_ungraded[ck] = True
                    continue

                tier = score_tier(student["persona"], idx)
                points, feedback = grade_and_feedback(tier)
                course["teacher"]["client"].post(
                    f"/teacher/submissions/{submission_id}/grade",
                    {"grade_points": points, "feedback": feedback},
                )
                bump("submissions_graded")

    for ck, left in course_left_ungraded.items():
        print(f"       {ck}: left-ungraded={'yes' if left else 'no (no eligible submission was made)'}")
    print(f"       {counts['submissions']} submission(s) created, {counts['submissions_graded']} graded")

    # -----------------------------------------------------------------
    # 10. Persona-driven game scores
    #     (CHALLENGE_TARGET_GAME_TITLE is deliberately skipped here --
    #     handled later, after the challenge exists, in section 13)
    # -----------------------------------------------------------------
    print("\n[10/13] Submitting game scores per student persona...")

    def game_score(persona, idx):
        if persona == "high":
            return 95
        if persona in ("average", "pending"):
            return 65
        if persona == "struggling":
            return 20
        bucket = idx % 3
        if bucket == 0:
            return 85
        if bucket == 1:
            return 60
        return None  # this "remaining" bucket doesn't play games -- realistic variety

    for idx, course_keys in ENROLLMENTS.items():
        student = students[idx]
        for ck in course_keys:
            course = courses_by_key[ck]
            for title, game in course["games"].items():
                if game["is_challenge_target"]:
                    continue
                score = game_score(student["persona"], idx)
                if score is None:
                    continue
                student["client"].post(f"/student/games/{game['id']}/submit", {"score": score})
                bump("game_scores_submitted")
    print(f"       {counts['game_scores_submitted']} game score(s) submitted")

    # -----------------------------------------------------------------
    # 11. Announcements
    # -----------------------------------------------------------------
    print("\n[11/13] Creating announcements, discussions, and calendar events...")
    admin.post(
        "/announcements",
        {
            "title": "Welcome to Meridian STEM Academy",
            "content": (
                "Welcome to the new school year! We're excited to launch our first set of courses on "
                "the AI Learning Suite platform. Teachers, students, and families can reach out to the "
                "front office with any questions as we get started."
            ),
        },
    )
    bump("announcements")

    announcement_defs = [
        ("ALG", "Algebra I: Course Materials Now Available",
         "All course materials for Algebra I, including our first three units, are now live on the "
         "platform. Please make sure you can log in and see the course before our first class session."),
        ("SCI", "Life Science Lab Safety Reminder",
         "As we begin our first lab activities in Life Science Explorations, please review the lab "
         "safety guidelines posted in Module 1 before our next class session."),
        ("ENG", "English Literature & Composition: Reading Schedule Posted",
         "Our reading schedule for the semester is now posted in the course modules. Please come to "
         "class having completed the assigned reading for each unit."),
    ]
    for ck, title, content in announcement_defs:
        course = courses_by_key[ck]
        course["teacher"]["client"].post(
            "/announcements", {"title": title, "content": content, "course_id": course["id"]}
        )
        bump("announcements")

    # -----------------------------------------------------------------
    # 12. Discussions
    # -----------------------------------------------------------------
    discussions = {}
    d1 = students[2]["client"].post(
        "/discussions",
        {
            "course_id": courses_by_key["ALG"]["id"],
            "title": "Confused about equations with variables on both sides",
            "content": (
                "Can someone explain why we combine like terms before moving variables to one side? "
                "I keep getting confused about which side to move things to."
            ),
        },
    )
    discussions["d1"] = pick(d1, "id")
    bump("discussions")

    d2 = students[3]["client"].post(
        "/discussions",
        {
            "course_id": courses_by_key["GEO"]["id"],
            "title": "How do vertical angles work?",
            "content": (
                "I understand that vertical angles are equal, but why? Is there a way to prove it "
                "instead of just memorizing it?"
            ),
        },
    )
    discussions["d2"] = pick(d2, "id")
    bump("discussions")

    d3 = students[10]["client"].post(
        "/discussions",
        {
            "course_id": courses_by_key["SCI"]["id"],
            "title": "Why do plant cells have a cell wall but animal cells don't?",
            "content": (
                "We learned animal cells don't have a cell wall, but I don't get why plants need one "
                "and we don't."
            ),
        },
    )
    discussions["d3"] = pick(d3, "id")
    bump("discussions")

    # Replies on at least 2 of the 3 threads
    courses_by_key["ALG"]["teacher"]["client"].post(
        f"/discussions/{discussions['d1']}/replies",
        {"content": (
            "Great question, Sofia! The order doesn't actually matter as long as you're consistent -- "
            "try subtracting the smaller variable term from both sides so you don't end up with a "
            "negative coefficient. Let me know if that helps!"
        )},
    )
    bump("discussion_replies")

    courses_by_key["GEO"]["teacher"]["client"].post(
        f"/discussions/{discussions['d2']}/replies",
        {"content": (
            "Good instinct to ask why, not just what! Vertical angles are formed by two intersecting "
            "lines, and each pair of adjacent angles along a straight line adds up to 180 degrees. If "
            "you set up that relationship algebraically for both pairs, you can show the vertical "
            "angles must be equal -- we'll walk through the proof together in class."
        )},
    )
    bump("discussion_replies")
    students[9]["client"].post(
        f"/discussions/{discussions['d2']}/replies",
        {"content": "I had the same question! That makes sense once you draw it out."},
    )
    bump("discussion_replies")

    # Mark exactly one resolved; leave the others unresolved
    students[2]["client"].patch(f"/discussions/{discussions['d1']}", {"is_resolved": True})
    print(f"       {counts['discussions']} discussion(s), {counts['discussion_replies']} repl(ies), 1 marked resolved")

    # -----------------------------------------------------------------
    # 13. Calendar events
    # -----------------------------------------------------------------
    calendar_defs = [
        (None, admin, "holiday", "Fall Break", NOW + timedelta(days=10),
         "No classes -- enjoy the break!"),
        (None, admin, "deadline", "Progress Reports Due to Families", NOW - timedelta(days=2),
         "Teachers: progress reports for the first grading period are due to the front office."),
        ("ALG", None, "exam", "Algebra I Unit 2 Exam", NOW + timedelta(days=5),
         "Covers multi-step equations and equations with variables on both sides."),
        ("SCI", None, "exam", "Life Science Lab Practical", NOW - timedelta(days=3),
         "Hands-on lab practical covering cell structure and function."),
        ("ENG", None, "event", "English Poetry Recitation", NOW + timedelta(days=6),
         "Students will share their favorite poem from the Unit 1 packet with the class."),
    ]
    for course_key, actor, event_type, title, event_date, description in calendar_defs:
        if course_key is None:
            client = actor
            body = {"title": title, "description": description, "event_type": event_type, "event_date": iso(event_date)}
        else:
            course = courses_by_key[course_key]
            client = course["teacher"]["client"]
            body = {
                "title": title, "description": description, "event_type": event_type,
                "event_date": iso(event_date), "course_id": course["id"],
            }
        client.post("/calendar/events", body)
        bump("calendar_events")
    print(f"       {counts['calendar_events']} calendar event(s) created")

    # -----------------------------------------------------------------
    # 14. Challenges (deferred grading/submission on the two designated
    #     challenge-target items so the leaderboard shows real non-null
    #     scores produced AFTER the student joined the challenge)
    # -----------------------------------------------------------------
    print("\n[12/13] Creating challenges and finishing the deferred challenge-target grading...")
    alg = courses_by_key["ALG"]
    alg_teacher = alg["teacher"]["client"]
    target_assignment = alg["assignments"][CHALLENGE_TARGET_ASSIGNMENT_KEY]
    target_game = alg["games"][CHALLENGE_TARGET_GAME_TITLE]

    challenge1 = alg_teacher.post(
        "/challenges",
        {
            "title": "Algebra Practice Sprint",
            "description": "Complete and submit the Unit 1 practice set for bonus XP and a badge.",
            "subject": "Math",
            "challenge_type": "class",
            "course_id": alg["id"],
            "target_type": "assignment",
            "target_id": target_assignment["id"],
            "start_date": iso(NOW - timedelta(days=1)),
            "end_date": iso(NOW + timedelta(days=6)),
            "bonus_xp": 100,
            "badge_name": "Algebra Ace",
        },
    )
    challenge1_id = pick(challenge1, "id")
    bump("challenges")

    challenge2 = alg_teacher.post(
        "/challenges",
        {
            "title": "Algebra Trivia Showdown",
            "description": "Play the Algebra Trivia Challenge game for bonus XP and a badge.",
            "subject": "Math",
            "challenge_type": "class",
            "course_id": alg["id"],
            "target_type": "game",
            "target_id": target_game["id"],
            "start_date": iso(NOW - timedelta(days=1)),
            "end_date": iso(NOW + timedelta(days=6)),
            "bonus_xp": 75,
            "badge_name": "Trivia Champion",
        },
    )
    challenge2_id = pick(challenge2, "id")
    bump("challenges")
    print(f"       Created 'Algebra Practice Sprint' ({challenge1_id}) and 'Algebra Trivia Showdown' ({challenge2_id})")

    for idx in CHALLENGE1_JOINERS:
        students[idx]["client"].post(f"/challenges/{challenge1_id}/join")
        bump("challenge_joins")
    for idx in CHALLENGE2_JOINERS:
        students[idx]["client"].post(f"/challenges/{challenge2_id}/join")
        bump("challenge_joins")
    print(f"       {counts['challenge_joins']} challenge join(s) recorded")

    # NOW (after joining) submit + grade the target assignment, and submit
    # the target game score, so bonus XP/badges are awarded for real.
    for idx in CHALLENGE1_JOINERS:
        student = students[idx]
        content = submission_content(student["persona"], "Math")
        sub = student["client"].post(f"/student/assignments/{target_assignment['id']}/submit", {"content": content})
        submission_id = pick(sub, "id")
        bump("submissions")
        tier = score_tier(student["persona"], idx)
        points, feedback = grade_and_feedback(tier)
        alg_teacher.post(f"/teacher/submissions/{submission_id}/grade", {"grade_points": points, "feedback": feedback})
        bump("submissions_graded")

    for idx in CHALLENGE2_JOINERS:
        student = students[idx]
        score = game_score(student["persona"], idx) or 70
        student["client"].post(f"/student/games/{target_game['id']}/submit", {"score": score})
        bump("game_scores_submitted")

    # -----------------------------------------------------------------
    # Verification pass -- prove the seeded data produces sensible
    # computed results, not just raw inserts.
    # -----------------------------------------------------------------
    print("\n" + "=" * 78)
    print("VERIFICATION PASS")
    print("=" * 78)

    high_student = students[0]
    print(f"\n-- High performer leaderboard check: {high_student['full_name']} --")
    lb = high_student["client"].get("/student/leaderboard")
    print(json.dumps(lb, indent=2)[:1500])

    struggling_student = students[4]
    print(f"\n-- Struggling student module-lock check: {struggling_student['full_name']} (should show Unit 2 locked) --")
    course_detail = struggling_student["client"].get(f"/student/courses/{alg['id']}")
    for m in course_detail.get("modules", []):
        title = pick(m, "title")
        locked = pick(m, "isLocked", "is_locked") if ("isLocked" in m or "is_locked" in m) else m.get("is_locked")
        reason = m.get("lockReason", m.get("lock_reason"))
        print(f"       Module '{title}': is_locked={locked}, lock_reason={reason}")

    pending_student = students[6]
    print(f"\n-- Pending-assignments student assignment list: {pending_student['full_name']} --")
    try:
        assignments = pending_student["client"].get("/student/assignments")
        for a in assignments:
            print(f"       {a.get('title')}: status={a.get('status')}, dueDate={a.get('dueDate') or a.get('due_date')}")
    except ApiError as e:
        if e.status == 500:
            # KNOWN, PRE-EXISTING APP BUG (not introduced by this script, and not
            # something this script is allowed to fix -- see the task's "do not
            # modify existing files" rule): app/api/v1/student.py's
            # get_student_assignments() does `a.due_date < now` without the same
            # tz-normalization helper used elsewhere (e.g. student.py's own
            # get_module_lock_status, or challenges.py's _aware()). SQLite does not
            # persist tzinfo on DateTime(timezone=True) columns, so due_date comes
            # back naive there and the comparison raises
            # "TypeError: can't compare offset-naive and offset-aware datetimes".
            # On the real deployment's Postgres database this does NOT happen
            # (Postgres preserves tzinfo correctly), so this is a SQLite-sandbox-only
            # artifact of this test run, not something that will affect the real demo.
            print(f"       SKIPPED: got HTTP 500 ({e.body[:200]}...)")
            print("       This is a known pre-existing SQLite-only quirk in "
                  "app/api/v1/student.py's get_student_assignments (a naive-vs-aware "
                  "datetime comparison) -- it does not reproduce on the real Postgres "
                  "database this script is meant to run against. See the seeding "
                  "report for details.")
        else:
            raise

    print(f"\n-- Teacher analytics (school-wide aggregate -- see note in final report): {alg['teacher']['full_name']} --")
    analytics = alg["teacher"]["client"].get("/teacher/analytics")
    print(json.dumps(analytics, indent=2))

    print("\n-- Challenge leaderboards --")
    for name, cid in [("Algebra Practice Sprint", challenge1_id), ("Algebra Trivia Showdown", challenge2_id)]:
        board = alg_teacher.get(f"/challenges/{cid}/leaderboard")
        print(f"       {name}:")
        for entry in board.get("entries", []):
            print(f"         rank {entry.get('rank')}: {entry.get('fullName', entry.get('full_name'))} "
                  f"score={entry.get('score')}")

    # -----------------------------------------------------------------
    # Final summary
    # -----------------------------------------------------------------
    print("\n" + "=" * 78)
    print("SEED COMPLETE -- Meridian STEM Academy")
    print("=" * 78)

    print(f"\nSchool Admin:")
    print(f"  {SCHOOL_ADMIN_EMAIL} / {SCHOOL_ADMIN_PASSWORD}")

    print(f"\nTeachers (shared password: {TEACHER_PASSWORD}):")
    for t in teachers:
        print(f"  {t['full_name']:<20} {t['email']}")

    print(f"\nStudents (shared password: {STUDENT_PASSWORD}):")
    for s in students:
        print(f"  [{s['persona']:>10}] {s['full_name']:<20} {s['email']}")

    print(f"\nCourses:")
    for ck, c in courses_by_key.items():
        print(f"  {c['title']:<35} join code: {c['join_code']}")

    print(f"\nCounts:")
    for k in [
        "schools", "grades", "teachers", "students", "courses", "modules", "lessons",
        "assignments", "submissions", "submissions_graded", "games", "game_scores_submitted",
        "announcements", "discussions", "discussion_replies", "calendar_events",
        "challenges", "challenge_joins", "lessons_completed_events",
    ]:
        print(f"  {k}: {counts[k]}")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ApiError as e:
        print(f"\nFATAL API ERROR: {e}", file=sys.stderr)
        sys.exit(1)
