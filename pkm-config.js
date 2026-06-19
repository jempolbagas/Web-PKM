/**
 * Academic PKM Configuration Database
 * Central repository for all courses, weeks, and note pages.
 * Used by pkm-loader.js to build sidebars, headers, indexes, and navigation dynamically.
 */

const PKM_CONFIG = {
  siteTitle: "Academic Life Hub",
  courses: [
    {
      id: "discrete-math",
      title: "Discrete Mathematics I",
      folder: "discrete-math",
      indexFile: "index.html",
      description: "A comprehensive series of learning materials covering the second half of Discrete Mathematics I. Each week takes you from intuition to mastery, with full narrative explanations, worked examples, and embedded active-recall exercises.",
      studyTime: "~6h",
      weeks: [
        { num: 9, title: "Discrete Series & Sequences", file: "week-09.html", difficulty: "Beginner", readingTime: "45–60 minutes", topics: "Arithmetic progression · Geometric series · Convergence · Loop complexity" },
        { num: 10, title: "Homogeneous Recurrence Relations", file: "week-10.html", difficulty: "Intermediate", readingTime: "50–70 minutes", topics: "Characteristic equation · Distinct roots · Repeated roots" },
        { num: 11, title: "Generating Functions — Foundations", file: "week-11.html", difficulty: "Intermediate", readingTime: "60–80 minutes", topics: "Ordinary GFs · Power series · Coefficient extraction" },
        { num: 12, title: "Advanced Recurrence Relations", file: "week-12.html", difficulty: "Hard", readingTime: "70–90 minutes", topics: "Non-homogeneous recurrences · Particular solutions · Divide-and-conquer" },
        { num: 13, title: "Generating Functions — Applications", file: "week-13.html", difficulty: "Hard", readingTime: "60–80 minutes", topics: "Solving recurrences with GFs · Partition problems · Counting" },
        { num: 14, title: "Inclusion-Exclusion Principle", file: "week-14.html", difficulty: "Intermediate", readingTime: "45–60 minutes", topics: "Venn diagrams · PIE formula · Derangements · Surjections" },
        { num: 15, title: "Relation Theory", file: "week-15.html", difficulty: "Intermediate", readingTime: "50–70 minutes", topics: "Relations on sets · Properties · Equivalence relations · Partial orders" },
        { num: 16, title: "UAS Mastery Review", file: "week-16.html", difficulty: "Hard", readingTime: "90 minutes", topics: "Comprehensive review · Exam strategy · Key theorems · Practice problems" }
      ]
    },
    {
      id: "computer-networks",
      title: "Computer Networks",
      folder: "",
      indexFile: "(CN)_7_IPv4.html",
      description: "A deep dive into IPv4 header formats, subnet masking, routing tables, and classful networks.",
      studyTime: "50m",
      weeks: [
        { num: 7, title: "IPv4 Addressing & Networking", file: "(CN)_7_IPv4.html", difficulty: "Medium", readingTime: "50 minutes", topics: "Headers formatting · Subnetting · CIDR · Classful networks" }
      ]
    },
    {
      id: "linear-algebra",
      title: "Linear Algebra",
      folder: "linear-algebra",
      indexFile: "index.html",
      description: "Introduction to matrices, vector spaces, and linear transformations.",
      studyTime: "~4h",
      weeks: [
        { num: 1, title: "Systems of Linear Equations", file: "week-01.html", difficulty: "Beginner", readingTime: "35–45 minutes", topics: "Linear equations · Matrix representation · Gaussian elimination" }
      ]
    }
  ]
};

// Export configuration for ESM or browser environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PKM_CONFIG;
}
